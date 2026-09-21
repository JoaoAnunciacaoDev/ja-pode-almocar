-- Explicitly revoke the legacy anon grant from the old invite-preview function.
-- The auth.uid() guard also fails closed if execute privileges drift later.
create or replace function public.get_group_invite(invite_code text)
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
