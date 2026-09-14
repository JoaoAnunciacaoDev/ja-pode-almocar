with duplicate_invites as (
  select id, row_number() over (partition by group_id order by created_at desc, id) as position
  from public.group_invites
  where revoked_at is null
)
update public.group_invites
set revoked_at = now()
where id in (select id from duplicate_invites where position > 1);

create unique index group_invites_one_active_per_group_idx
on public.group_invites(group_id)
where revoked_at is null;

create or replace function public.get_active_group_invite(target_group_id uuid)
returns text
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  invite_code text;
begin
  if not public.is_group_owner(target_group_id) then raise exception 'Only the group owner can manage invites'; end if;
  select code into invite_code
  from public.group_invites
  where group_id = target_group_id
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;
  return invite_code;
end;
$$;

create or replace function public.revoke_group_invite(target_group_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_group_owner(target_group_id) then raise exception 'Only the group owner can manage invites'; end if;
  update public.group_invites set revoked_at = now()
  where group_id = target_group_id and revoked_at is null;
end;
$$;

create or replace function public.regenerate_group_invite(target_group_id uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  invite_code text;
begin
  if not public.is_group_owner(target_group_id) then raise exception 'Only the group owner can manage invites'; end if;

  update public.group_invites set revoked_at = now()
  where group_id = target_group_id and revoked_at is null;

  insert into public.group_invites (group_id, created_by)
  values (target_group_id, auth.uid())
  returning code into invite_code;

  return invite_code;
end;
$$;

create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.is_group_owner(target_group_id) then raise exception 'Transfer ownership or delete the group before leaving'; end if;
  if not public.is_group_member(target_group_id) then raise exception 'You are not a member of this group'; end if;

  delete from public.meal_entries where group_id = target_group_id and (user_id = auth.uid() or waiting_for_user_id = auth.uid());
  delete from public.meal_routines where group_id = target_group_id and user_id = auth.uid();
  delete from public.group_members where group_id = target_group_id and user_id = auth.uid();
end;
$$;

create or replace function public.remove_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_group_owner(target_group_id) then raise exception 'Only the group owner can remove members'; end if;
  if target_user_id = auth.uid() then raise exception 'The owner cannot remove themselves'; end if;
  if not public.is_group_member(target_group_id, target_user_id) then raise exception 'User is not a member of this group'; end if;

  delete from public.meal_entries where group_id = target_group_id and (user_id = target_user_id or waiting_for_user_id = target_user_id);
  delete from public.meal_routines where group_id = target_group_id and user_id = target_user_id;
  delete from public.group_members where group_id = target_group_id and user_id = target_user_id and role = 'MEMBER';
end;
$$;

create or replace function public.transfer_group_ownership(target_group_id uuid, new_owner_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_group_owner(target_group_id) then raise exception 'Only the group owner can transfer ownership'; end if;
  if new_owner_id = auth.uid() then raise exception 'This user already owns the group'; end if;
  if not public.is_group_member(target_group_id, new_owner_id) then raise exception 'The new owner must be a group member'; end if;

  update public.groups set owner_id = new_owner_id where id = target_group_id;
  update public.group_members set role = 'MEMBER' where group_id = target_group_id and user_id = auth.uid();
  update public.group_members set role = 'OWNER' where group_id = target_group_id and user_id = new_owner_id;
end;
$$;

create or replace function public.delete_group(target_group_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_group_owner(target_group_id) then raise exception 'Only the group owner can delete the group'; end if;
  delete from public.groups where id = target_group_id;
end;
$$;

revoke all on function public.get_active_group_invite(uuid) from public;
revoke all on function public.revoke_group_invite(uuid) from public;
revoke all on function public.regenerate_group_invite(uuid) from public;
revoke all on function public.leave_group(uuid) from public;
revoke all on function public.remove_group_member(uuid, uuid) from public;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public;
revoke all on function public.delete_group(uuid) from public;

grant execute on function public.get_active_group_invite(uuid) to authenticated;
grant execute on function public.revoke_group_invite(uuid) to authenticated;
grant execute on function public.regenerate_group_invite(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
