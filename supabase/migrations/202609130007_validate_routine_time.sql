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
  ) then
    raise exception 'Routine time is outside the group meal window';
  end if;
  return new;
end;
$$;

create trigger meal_routines_validate_time
before insert or update on public.meal_routines
for each row execute function public.validate_meal_routine_time();
