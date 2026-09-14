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
    and (run_at at time zone app_group.timezone)::time >= time '07:00'
    and (run_at at time zone app_group.timezone)::time < time '07:15'
  on conflict (user_id, group_id, notification_type, local_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.enqueue_due_breakfast_notifications(timestamptz) from public;
grant execute on function public.enqueue_due_breakfast_notifications(timestamptz) to service_role;

alter function public.claim_due_notification_deliveries(timestamptz, integer)
rename to claim_due_non_breakfast_deliveries;

revoke all on function public.claim_due_non_breakfast_deliveries(timestamptz, integer) from public;
grant execute on function public.claim_due_non_breakfast_deliveries(timestamptz, integer) to service_role;

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
  group_timezone text
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

revoke all on function public.claim_due_notification_deliveries(timestamptz, integer) from public;
grant execute on function public.claim_due_notification_deliveries(timestamptz, integer) to service_role;
