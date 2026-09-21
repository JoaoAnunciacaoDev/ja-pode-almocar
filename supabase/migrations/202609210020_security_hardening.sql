-- Keep private profile fields behind self-only RLS. Group peers receive only the
-- display fields needed by the UI through get_group_member_profiles().
drop policy if exists "profiles read self or group peers" on public.profiles;

create policy "profiles read self" on public.profiles for select to authenticated
using (id = auth.uid());

create or replace function public.get_group_member_profiles(target_group_id uuid)
returns table (id uuid, name text, role public.group_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_group_member(target_group_id) then
    raise exception 'You are not a member of this group';
  end if;

  return query
  select profile.id, profile.name, membership.role
  from public.group_members membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.group_id = target_group_id
  order by membership.joined_at, profile.id;
end;
$$;

revoke all on function public.get_group_member_profiles(uuid) from public, anon;
grant execute on function public.get_group_member_profiles(uuid) to authenticated;

-- New invite codes contain 128 random bits. Rotate every still-active weak code
-- so the old 40-bit links stop working immediately after this migration.
alter table public.group_invites
  alter column code set default upper(encode(extensions.gen_random_bytes(16), 'hex'));

update public.group_invites
set code = upper(encode(extensions.gen_random_bytes(16), 'hex'))
where revoked_at is null and length(code) < 32;

-- Invite metadata is no longer anonymously readable, and the preview reveals
-- only the group name needed to let an authenticated user confirm the action.
drop function if exists public.get_group_invite(text);

create function public.get_group_invite(invite_code text)
returns table (group_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select g.name
  from public.group_invites invite
  join public.groups g on g.id = invite.group_id
  where auth.uid() is not null
    and invite.code = upper(invite_code)
    and invite.revoked_at is null
    and (invite.expires_at is null or invite.expires_at > now());
$$;

revoke all on function public.get_group_invite(text) from public, anon;
grant execute on function public.get_group_invite(text) to authenticated;

-- Require a token minted in the last five minutes for permanent account
-- deletion. The client obtains one by checking the current password again.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued_at bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  begin
    issued_at := (auth.jwt() ->> 'iat')::bigint;
  exception when others then
    raise exception 'Recent authentication required';
  end;

  if issued_at is null or to_timestamp(issued_at) < now() - interval '5 minutes' then
    raise exception 'Recent authentication required';
  end if;

  if exists (select 1 from public.groups where owner_id = auth.uid()) then
    raise exception 'Transfer or delete owned groups first';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- The notification endpoint is intentionally non-JWT because pg_cron calls it.
-- Use a 256-bit shared secret instead of the previous UUID and rotate it now.
alter table public.notification_dispatch_config
  alter column cron_token type text using cron_token::text,
  alter column cron_token set default encode(extensions.gen_random_bytes(32), 'hex');

update public.notification_dispatch_config
set cron_token = encode(extensions.gen_random_bytes(32), 'hex');
