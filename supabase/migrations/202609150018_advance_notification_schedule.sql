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
    and (run_at at time zone app_group.timezone)::time >= time '06:30'
    and (run_at at time zone app_group.timezone)::time < time '06:45'
  on conflict (user_id, group_id, notification_type, local_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

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
        ('PARTICIPATION_REMINDER'::public.notification_type, time '08:30', context.participation_reminder_enabled),
        ('DAILY_LUNCH_SUMMARY'::public.notification_type, time '10:30', context.daily_lunch_summary_enabled),
        ('DINNER_SUMMARY'::public.notification_type, time '16:30', context.dinner_summary_enabled),
        ('WEEKLY_REVIEW'::public.notification_type, time '17:30', context.weekly_review_enabled and context.local_weekday = 0)
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

revoke all on function public.enqueue_due_breakfast_notifications(timestamptz) from public;
grant execute on function public.enqueue_due_breakfast_notifications(timestamptz) to service_role;

revoke all on function public.claim_due_non_breakfast_deliveries(timestamptz, integer) from public;
grant execute on function public.claim_due_non_breakfast_deliveries(timestamptz, integer) to service_role;
