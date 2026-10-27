-- 1. Add notification channel preferences to notification_preferences
alter table public.notification_preferences
add column if not exists email_enabled boolean not null default true,
add column if not exists push_enabled boolean not null default false;

-- 2. Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "users read own push subscriptions"
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

create policy "users insert own push subscriptions"
on public.push_subscriptions for insert to authenticated
with check (user_id = auth.uid());

create policy "users delete own push subscriptions"
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

revoke all on table public.push_subscriptions from anon, public;
grant select, insert, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

-- 3. Update enqueue_due_breakfast_notifications to check channel preferences
create or replace function public.enqueue_due_breakfast_notifications(run_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  insert into public.notification_deliveries (
    user_id,
    group_id,
    notification_type,
    local_date
  )
  select
    member.user_id,
    member.group_id,
    'DAILY_BREAKFAST_SUMMARY'::public.notification_type,
    (run_at at time zone app_group.timezone)::date
  from public.group_members member
  join public.groups app_group on app_group.id = member.group_id
  left join public.notification_preferences preferences on preferences.user_id = member.user_id
  where coalesce(preferences.daily_breakfast_summary_enabled, false)
    and (coalesce(preferences.email_enabled, true) or coalesce(preferences.push_enabled, false))
    and (run_at at time zone app_group.timezone)::time >= time '06:30'
    and (run_at at time zone app_group.timezone)::time < time '06:45'
  on conflict (user_id, group_id, notification_type, local_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.enqueue_due_breakfast_notifications(timestamptz) from public;
grant execute on function public.enqueue_due_breakfast_notifications(timestamptz) to service_role;

-- 4. Drop dependent functions in order to update return signatures
drop function if exists public.claim_due_notification_deliveries(timestamptz, integer);
drop function if exists public.claim_due_non_breakfast_deliveries(timestamptz, integer);

create or replace function public.claim_due_non_breakfast_deliveries(
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
  group_timezone text,
  email_enabled boolean,
  push_enabled boolean
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
      coalesce(np.email_enabled, true) as email_enabled,
      coalesce(np.push_enabled, false) as push_enabled,
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
        ('PARTICIPATION_REMINDER'::public.notification_type, time '08:30', context.participation_reminder_enabled),
        ('DAILY_LUNCH_SUMMARY'::public.notification_type, time '10:30', context.daily_lunch_summary_enabled),
        ('DINNER_SUMMARY'::public.notification_type, time '16:30', context.dinner_summary_enabled),
        ('WEEKLY_REVIEW'::public.notification_type, time '17:30', context.weekly_review_enabled and context.local_weekday = 0)
    ) as schedule(notification_type, scheduled_time, enabled)
    where schedule.enabled
      and (context.email_enabled or context.push_enabled)
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
    app_group.timezone as group_timezone,
    coalesce(np.email_enabled, true) as email_enabled,
    coalesce(np.push_enabled, false) as push_enabled
  from claimed
  join public.profiles profile on profile.id = claimed.user_id
  join public.groups app_group on app_group.id = claimed.group_id
  left join public.notification_preferences np on np.user_id = claimed.user_id;
end;
$$;

create function public.claim_due_notification_deliveries(
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
  group_timezone text,
  email_enabled boolean,
  push_enabled boolean
)
language sql
security definer
set search_path = ''
as $$
  with breakfast as materialized (
    select public.enqueue_due_breakfast_notifications(run_at)
  )
  select claimed.*
  from breakfast
  cross join lateral public.claim_due_non_breakfast_deliveries(run_at, batch_size) claimed;
$$;

revoke all on function public.claim_due_non_breakfast_deliveries(timestamptz, integer) from public;
grant execute on function public.claim_due_non_breakfast_deliveries(timestamptz, integer) to service_role;

revoke all on function public.claim_due_notification_deliveries(timestamptz, integer) from public;
grant execute on function public.claim_due_notification_deliveries(timestamptz, integer) to service_role;
