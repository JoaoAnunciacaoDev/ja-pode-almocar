alter table public.meal_entries add column available_until time;
alter table public.meal_routines add column available_until time;

alter table public.meal_entries drop constraint meal_entries_participation_mode;
alter table public.meal_entries add constraint meal_entries_participation_mode check (
  (
    waiting_for_user_id is null and
    (
      (status = 'NOT_GOING' and time is null and available_until is null) or
      (
        status in ('CONFIRMED', 'PLANNED') and
        time is not null and
        (available_until is null or available_until > time)
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

alter table public.meal_routines add constraint meal_routines_valid_availability
check (available_until is null or available_until > time);

create or replace function public.validate_meal_routine_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.group_meal_windows
    where group_id = new.group_id
      and meal_type = new.meal_type
      and new.time between open_time and close_time
      and (new.available_until is null or new.available_until <= close_time)
  ) then
    raise exception 'Routine availability is outside the group meal window';
  end if;
  return new;
end;
$$;

create or replace function public.validate_meal_entry_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.time is not null and not exists (
    select 1
    from public.group_meal_windows
    where group_id = new.group_id
      and meal_type = new.meal_type
      and new.time between open_time and close_time
      and (new.available_until is null or new.available_until <= close_time)
  ) then
    raise exception 'Meal availability is outside the group meal window';
  end if;
  return new;
end;
$$;

create trigger meal_entries_validate_time
before insert or update on public.meal_entries
for each row execute function public.validate_meal_entry_time();
