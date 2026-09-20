alter table public.groups
add column include_saturday boolean not null default false,
add column include_sunday boolean not null default false;

create or replace function public.group_allows_notifications_on_date(
  target_group_id uuid,
  target_date date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case extract(dow from target_date)::smallint
    when 6 then app_group.include_saturday
    when 0 then app_group.include_sunday
    else true
  end
  from public.groups app_group
  where app_group.id = target_group_id;
$$;

revoke all on function public.group_allows_notifications_on_date(uuid, date) from public;

create or replace function public.enforce_group_notification_days()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.group_allows_notifications_on_date(new.group_id, new.local_date) then
    if tg_op = 'INSERT' then
      return null;
    end if;

    if new.status = 'SENDING' and old.status <> 'SENDING' then
      return null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_group_notification_days() from public;

create trigger notification_deliveries_respect_group_days
before insert or update of status on public.notification_deliveries
for each row execute function public.enforce_group_notification_days();

-- Remove unsent weekend notifications that were queued before this rule existed.
delete from public.notification_deliveries delivery
using public.groups app_group
where delivery.group_id = app_group.id
  and delivery.status in ('PENDING', 'FAILED')
  and (
    (extract(dow from delivery.local_date)::smallint = 6 and not app_group.include_saturday)
    or (extract(dow from delivery.local_date)::smallint = 0 and not app_group.include_sunday)
  );
