alter table public.groups
add column institution text not null default '' check (char_length(institution) <= 160);

drop function public.create_group(text, text);

create or replace function public.create_group(
  group_name text,
  group_institution text,
  group_timezone text default 'America/Sao_Paulo'
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(group_name)) not between 1 and 100 then raise exception 'Invalid group name'; end if;
  if char_length(trim(group_institution)) > 160 then raise exception 'Invalid institution'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = group_timezone) then
    raise exception 'Invalid timezone';
  end if;

  insert into public.groups (name, institution, owner_id, timezone)
  values (trim(group_name), trim(group_institution), auth.uid(), group_timezone)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'OWNER');

  insert into public.group_meal_windows (group_id, meal_type, open_time, close_time, interval_minutes)
  values
    (new_group_id, 'BREAKFAST', '06:30', '09:30', 10),
    (new_group_id, 'LUNCH', '11:00', '14:00', 10),
    (new_group_id, 'DINNER', '17:00', '20:00', 10);

  return new_group_id;
end;
$$;

revoke all on function public.create_group(text, text, text) from public;
grant execute on function public.create_group(text, text, text) to authenticated;

create or replace function public.get_group_invite(invite_code text)
returns table (group_id uuid, group_name text, institution text, member_count bigint)
language sql
stable
security definer set search_path = ''
as $$
  select g.id, g.name, g.institution, count(gm.user_id)
  from public.group_invites gi
  join public.groups g on g.id = gi.group_id
  left join public.group_members gm on gm.group_id = g.id
  where gi.code = upper(invite_code)
    and gi.revoked_at is null
    and (gi.expires_at is null or gi.expires_at > now())
  group by g.id, g.name, g.institution;
$$;

revoke all on function public.get_group_invite(text) from public;
grant execute on function public.get_group_invite(text) to anon, authenticated;
