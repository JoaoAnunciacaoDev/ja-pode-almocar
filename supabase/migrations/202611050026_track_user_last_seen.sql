-- 1. Add last_seen_at column to profiles table
alter table public.profiles
add column if not exists last_seen_at timestamptz default now();

-- 2. RPC to record user access when visiting the site
create or replace function public.record_user_access()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    update public.profiles
    set last_seen_at = now()
    where id = auth.uid()
      and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
  end if;
end;
$$;

revoke all on function public.record_user_access() from public, anon;
grant execute on function public.record_user_access() to authenticated;

-- 3. Update get_boss_dashboard_data to reflect immediate access and activity timestamps
create or replace function public.get_boss_dashboard_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid() and is_boss = true) then
    raise exception 'Acesso restrito ao papel Boss.';
  end if;

  -- Update caller's own last_seen_at immediately on dashboard load
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();

  select jsonb_build_object(
    'groups', (
      select coalesce(jsonb_agg(group_item), '[]'::jsonb)
      from (
        select
          g.id,
          g.name,
          g.slug,
          g.timezone,
          g.created_at,
          owner_p.id as owner_id,
          owner_p.name as owner_name,
          owner_p.email as owner_email,
          count(gm.user_id)::int as members_count
        from public.groups g
        left join public.profiles owner_p on owner_p.id = g.owner_id
        left join public.group_members gm on gm.group_id = g.id
        group by g.id, g.name, g.slug, g.timezone, g.created_at, owner_p.id, owner_p.name, owner_p.email
        order by g.created_at desc
      ) group_item
    ),
    'users', (
      select coalesce(jsonb_agg(user_item), '[]'::jsonb)
      from (
        select
          p.id,
          p.name,
          p.email,
          p.created_at,
          p.is_boss,
          coalesce(
            greatest(
              p.last_seen_at,
              u.last_sign_in_at,
              p.updated_at,
              (select max(me.updated_at) from public.meal_entries me where me.user_id = p.id),
              (select max(ps.updated_at) from public.push_subscriptions ps where ps.user_id = p.id)
            ),
            p.last_seen_at,
            u.last_sign_in_at,
            p.updated_at,
            p.created_at
          ) as last_sign_in_at,
          count(distinct gm.group_id)::int as groups_count
        from public.profiles p
        left join auth.users u on u.id = p.id
        left join public.group_members gm on gm.user_id = p.id
        group by p.id, p.name, p.email, p.created_at, p.is_boss, p.last_seen_at, u.last_sign_in_at, p.updated_at
        order by p.created_at desc
      ) user_item
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_boss_dashboard_data() from public, anon;
grant execute on function public.get_boss_dashboard_data() to authenticated;
