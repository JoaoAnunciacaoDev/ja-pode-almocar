create table public.group_meal_windows (
  group_id uuid not null references public.groups(id) on delete cascade,
  meal_type public.meal_type not null,
  open_time time not null,
  close_time time not null,
  interval_minutes smallint not null default 10,
  updated_at timestamptz not null default now(),
  primary key (group_id, meal_type),
  constraint group_meal_windows_valid_range check (close_time > open_time),
  constraint group_meal_windows_valid_interval check (interval_minutes in (5, 10, 15, 20, 30))
);

create trigger group_meal_windows_set_updated_at
before update on public.group_meal_windows
for each row execute function public.set_updated_at();

alter table public.group_meal_windows enable row level security;

create policy "members read meal windows" on public.group_meal_windows
for select to authenticated
using (public.is_group_member(group_id));

create policy "owners create meal windows" on public.group_meal_windows
for insert to authenticated
with check (public.is_group_owner(group_id));

create policy "owners update meal windows" on public.group_meal_windows
for update to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "owners delete meal windows" on public.group_meal_windows
for delete to authenticated
using (public.is_group_owner(group_id));
