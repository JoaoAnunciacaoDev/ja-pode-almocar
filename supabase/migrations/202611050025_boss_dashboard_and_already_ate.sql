-- 1. Add is_boss column to profiles table
alter table public.profiles
add column if not exists is_boss boolean not null default false;

-- 2. Update meal_entries participation mode constraint to accommodate ALREADY_ATE
alter table public.meal_entries drop constraint if exists meal_entries_participation_mode;
alter table public.meal_entries drop constraint if exists meal_entries_time_matches_status;

alter table public.meal_entries add constraint meal_entries_participation_mode check (
  (
    waiting_for_user_id is null and
    (
      (status = 'NOT_GOING' and time is null and available_until is null) or
      (
        status in ('CONFIRMED', 'PLANNED') and
        time is not null and
        (available_until is null or available_until > time)
      ) or
      (
        status = 'ALREADY_ATE' and
        (available_until is null or (time is not null and available_until > time))
      )
    )
  ) or (
    waiting_for_user_id is not null and
    waiting_for_user_id <> user_id and
    status = 'PLANNED' and
    time is null and
    available_until is null
  )
);

-- Note: To designate the initial Boss user, execute:
-- update public.profiles set is_boss = true where email = 'admin@example.com';

-- 3. RPC to fetch all system dashboard data for Boss
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
          u.last_sign_in_at,
          count(gm.group_id)::int as groups_count
        from public.profiles p
        left join auth.users u on u.id = p.id
        left join public.group_members gm on gm.user_id = p.id
        group by p.id, p.name, p.email, p.created_at, p.is_boss, u.last_sign_in_at
        order by p.created_at desc
      ) user_item
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_boss_dashboard_data() from public, anon;
grant execute on function public.get_boss_dashboard_data() to authenticated;

-- 4. RPC to allow an active Boss to promote or demote other users to/from Boss
create or replace function public.set_user_boss_status(target_user_id uuid, make_boss boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_boss boolean;
  boss_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select is_boss into caller_is_boss
  from public.profiles
  where id = auth.uid();

  if not coalesce(caller_is_boss, false) then
    raise exception 'Apenas usuários com papel Boss podem alterar permissões de outros usuários.';
  end if;

  if auth.uid() = target_user_id and make_boss is false then
    select count(*) into boss_count
    from public.profiles
    where is_boss = true;

    if boss_count <= 1 then
      raise exception 'Você não pode remover seu próprio papel se for o único Boss do sistema.';
    end if;
  end if;

  update public.profiles
  set is_boss = make_boss
  where id = target_user_id;

  return true;
end;
$$;

revoke all on function public.set_user_boss_status(uuid, boolean) from public, anon;
grant execute on function public.set_user_boss_status(uuid, boolean) to authenticated;
