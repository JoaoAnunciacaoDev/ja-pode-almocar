create type public.notification_type as enum (
  'WEEKLY_REVIEW',
  'DAILY_LUNCH_SUMMARY',
  'PARTICIPATION_REMINDER',
  'DINNER_SUMMARY'
);

create type public.notification_delivery_status as enum (
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED'
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  notification_type public.notification_type not null,
  local_date date not null,
  status public.notification_delivery_status not null default 'PENDING',
  attempt_count smallint not null default 0 check (attempt_count between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_once_per_day unique (
    user_id,
    group_id,
    notification_type,
    local_date
  )
);

create index notification_deliveries_dispatch_idx
on public.notification_deliveries(status, next_attempt_at)
where status in ('PENDING', 'SENDING', 'FAILED');

create trigger notification_deliveries_set_updated_at
before update on public.notification_deliveries
for each row execute function public.set_updated_at();

alter table public.notification_deliveries enable row level security;
revoke all on table public.notification_deliveries from anon, authenticated;
grant select, insert, update on table public.notification_deliveries to service_role;

create table public.notification_dispatch_config (
  singleton boolean primary key default true check (singleton),
  cron_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

insert into public.notification_dispatch_config default values;
alter table public.notification_dispatch_config enable row level security;
revoke all on table public.notification_dispatch_config from anon, authenticated;
grant select on table public.notification_dispatch_config to service_role;

create or replace function public.claim_due_notification_deliveries(
  run_at timestamptz default now(),
  batch_size integer default 50
)
returns table (
  id uuid,
  user_id uuid,
  group_id uuid,
  notification_type public.notification_type,
  local_date date,
  attempt_count smallint,
  recipient_name text,
  recipient_email text,
  group_name text,
  group_slug text,
  group_timezone text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if batch_size not between 1 and 100 then
    raise exception 'Batch size must be between 1 and 100';
  end if;

  insert into public.notification_deliveries (
    user_id,
    group_id,
    notification_type,
    local_date
  )
  with member_context as (
    select
      gm.user_id,
      gm.group_id,
      g.timezone,
      (run_at at time zone g.timezone)::date as local_date,
      (run_at at time zone g.timezone)::time as local_time,
      extract(dow from run_at at time zone g.timezone)::smallint as local_weekday,
      coalesce(np.weekly_review_enabled, true) as weekly_review_enabled,
      coalesce(np.daily_lunch_summary_enabled, true) as daily_lunch_summary_enabled,
      coalesce(np.participation_reminder_enabled, true) as participation_reminder_enabled,
      coalesce(np.dinner_summary_enabled, false) as dinner_summary_enabled
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    left join public.notification_preferences np on np.user_id = gm.user_id
  ),
  due as (
    select
      context.user_id,
      context.group_id,
      schedule.notification_type,
      context.local_date
    from member_context context
    cross join lateral (
      values
        ('PARTICIPATION_REMINDER'::public.notification_type, time '09:00', context.participation_reminder_enabled),
        ('DAILY_LUNCH_SUMMARY'::public.notification_type, time '11:00', context.daily_lunch_summary_enabled),
        ('DINNER_SUMMARY'::public.notification_type, time '17:00', context.dinner_summary_enabled),
        ('WEEKLY_REVIEW'::public.notification_type, time '18:00', context.weekly_review_enabled and context.local_weekday = 0)
    ) as schedule(notification_type, scheduled_time, enabled)
    where schedule.enabled
      and context.local_time >= schedule.scheduled_time
      and context.local_time < schedule.scheduled_time + interval '15 minutes'
      and (
        schedule.notification_type <> 'PARTICIPATION_REMINDER'
        or exists (
          select 1
          from public.meal_entries entry
          where entry.group_id = context.group_id
            and entry.user_id = context.user_id
            and entry.date = context.local_date
            and entry.meal_type = 'LUNCH'
            and entry.status = 'PLANNED'
        )
        or (
          not exists (
            select 1
            from public.meal_entries entry
            where entry.group_id = context.group_id
              and entry.user_id = context.user_id
              and entry.date = context.local_date
              and entry.meal_type = 'LUNCH'
          )
          and exists (
            select 1
            from public.meal_routines routine
            where routine.group_id = context.group_id
              and routine.user_id = context.user_id
              and routine.weekday = context.local_weekday
              and routine.meal_type = 'LUNCH'
              and context.local_date between routine.start_date and routine.end_date
          )
        )
      )
  )
  select due.user_id, due.group_id, due.notification_type, due.local_date
  from due
  on conflict (user_id, group_id, notification_type, local_date) do nothing;

  return query
  with claimable as (
    select delivery.id
    from public.notification_deliveries delivery
    where delivery.attempt_count < 5
      and delivery.next_attempt_at <= run_at
      and (
        delivery.status in ('PENDING', 'FAILED')
        or (delivery.status = 'SENDING' and delivery.updated_at < run_at - interval '15 minutes')
      )
    order by delivery.next_attempt_at, delivery.created_at
    for update skip locked
    limit batch_size
  ),
  claimed as (
    update public.notification_deliveries delivery
    set
      status = 'SENDING',
      attempt_count = delivery.attempt_count + 1,
      last_error = null
    from claimable
    where delivery.id = claimable.id
    returning delivery.*
  )
  select
    claimed.id,
    claimed.user_id,
    claimed.group_id,
    claimed.notification_type,
    claimed.local_date,
    claimed.attempt_count,
    profile.name as recipient_name,
    profile.email as recipient_email,
    app_group.name as group_name,
    app_group.slug as group_slug,
    app_group.timezone as group_timezone
  from claimed
  join public.profiles profile on profile.id = claimed.user_id
  join public.groups app_group on app_group.id = claimed.group_id;
end;
$$;

revoke all on function public.claim_due_notification_deliveries(timestamptz, integer) from public;
grant execute on function public.claim_due_notification_deliveries(timestamptz, integer) to service_role;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'dispatch-notification-reminders',
  '*/5 * * * *',
  $schedule$
    select net.http_post(
      url := 'https://hglslwjkyjkgfvnflanl.supabase.co/functions/v1/send-notification-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (select cron_token::text from public.notification_dispatch_config where singleton)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $schedule$
);
