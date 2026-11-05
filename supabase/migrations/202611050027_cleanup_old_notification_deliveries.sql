-- Automatic retention cleanup for notification deliveries.
-- Deletes finished records (SENT or FAILED) older than the retention period (default: 30 days).
create or replace function public.cleanup_old_notification_deliveries(retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if retention_days < 7 then
    raise exception 'Retention period must be at least 7 days';
  end if;

  delete from public.notification_deliveries
  where created_at < now() - (retention_days || ' days')::interval
    and status in ('SENT', 'FAILED');

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_old_notification_deliveries(integer) from public, anon;
grant execute on function public.cleanup_old_notification_deliveries(integer) to service_role;
