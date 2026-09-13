create extension if not exists pgcrypto;

create type public.group_role as enum ('OWNER', 'MEMBER');
create type public.meal_type as enum ('BREAKFAST', 'LUNCH', 'DINNER');
create type public.meal_status as enum ('CONFIRMED', 'PLANNED', 'NOT_GOING');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  owner_id uuid not null references public.profiles(id),
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.meal_routines (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  meal_type public.meal_type not null,
  time time not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_routines_valid_period check (end_date >= start_date),
  constraint meal_routines_unique_slot unique (group_id, user_id, weekday, meal_type, start_date)
);

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  time time,
  status public.meal_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_entries_time_matches_status check (
    (status = 'NOT_GOING' and time is null) or
    (status in ('CONFIRMED', 'PLANNED') and time is not null)
  ),
  constraint meal_entries_one_per_meal unique (group_id, user_id, date, meal_type)
);

create index group_members_user_id_idx on public.group_members(user_id);
create index meal_routines_lookup_idx on public.meal_routines(group_id, weekday, start_date, end_date);
create index meal_entries_lookup_idx on public.meal_entries(group_id, date, meal_type);
create index group_invites_code_idx on public.group_invites(code) where revoked_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();
create trigger meal_routines_set_updated_at before update on public.meal_routines
for each row execute function public.set_updated_at();
create trigger meal_entries_set_updated_at before update on public.meal_entries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = target_user_id
  );
$$;

create or replace function public.is_group_owner(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups
    where id = target_group_id and owner_id = target_user_id
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.is_group_owner(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated;

create or replace function public.create_group(group_name text, group_timezone text default 'America/Sao_Paulo')
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(group_name)) not between 1 and 100 then raise exception 'Invalid group name'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = group_timezone) then
    raise exception 'Invalid timezone';
  end if;

  insert into public.groups (name, owner_id, timezone)
  values (trim(group_name), auth.uid(), group_timezone)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'OWNER');

  return new_group_id;
end;
$$;

revoke all on function public.create_group(text, text) from public;
grant execute on function public.create_group(text, text) to authenticated;

create or replace function public.accept_group_invite(invite_code text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  invited_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select group_id into invited_group_id
  from public.group_invites
  where code = upper(invite_code)
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if invited_group_id is null then raise exception 'Invalid or expired invite'; end if;

  insert into public.group_members (group_id, user_id, role)
  values (invited_group_id, auth.uid(), 'MEMBER')
  on conflict (group_id, user_id) do nothing;

  return invited_group_id;
end;
$$;

revoke all on function public.accept_group_invite(text) from public;
grant execute on function public.accept_group_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.meal_routines enable row level security;
alter table public.meal_entries enable row level security;

create policy "profiles read self or group peers" on public.profiles for select to authenticated
using (
  id = auth.uid() or exists (
    select 1 from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
create policy "profiles update self" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "groups read by members" on public.groups for select to authenticated
using (public.is_group_member(id));
create policy "groups update by owner" on public.groups for update to authenticated
using (public.is_group_owner(id)) with check (owner_id = auth.uid());
create policy "groups delete by owner" on public.groups for delete to authenticated
using (public.is_group_owner(id));

create policy "members read group" on public.group_members for select to authenticated
using (public.is_group_member(group_id));
create policy "owner creates initial membership" on public.group_members for insert to authenticated
with check (user_id = auth.uid() and role = 'OWNER' and public.is_group_owner(group_id));
create policy "self or owner removes membership" on public.group_members for delete to authenticated
using (role = 'MEMBER' and (user_id = auth.uid() or public.is_group_owner(group_id)));

create policy "owners manage invites" on public.group_invites for all to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id) and created_by = auth.uid());

create policy "members read routines" on public.meal_routines for select to authenticated
using (public.is_group_member(group_id));
create policy "users create own routines" on public.meal_routines for insert to authenticated
with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy "users update own routines" on public.meal_routines for update to authenticated
using (user_id = auth.uid() and public.is_group_member(group_id))
with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy "users delete own routines" on public.meal_routines for delete to authenticated
using (user_id = auth.uid() and public.is_group_member(group_id));

create policy "members read entries" on public.meal_entries for select to authenticated
using (public.is_group_member(group_id));
create policy "users create own entries" on public.meal_entries for insert to authenticated
with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy "users update own entries" on public.meal_entries for update to authenticated
using (user_id = auth.uid() and public.is_group_member(group_id))
with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy "users delete own entries" on public.meal_entries for delete to authenticated
using (user_id = auth.uid() and public.is_group_member(group_id));
