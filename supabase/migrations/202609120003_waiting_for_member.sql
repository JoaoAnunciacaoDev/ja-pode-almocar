alter table public.meal_entries
add column waiting_for_user_id uuid references public.profiles(id) on delete set null;

alter table public.meal_entries
drop constraint meal_entries_time_matches_status;

alter table public.meal_entries
add constraint meal_entries_participation_mode check (
  (
    waiting_for_user_id is null and
    (
      (status = 'NOT_GOING' and time is null) or
      (status in ('CONFIRMED', 'PLANNED') and time is not null)
    )
  ) or (
    waiting_for_user_id is not null and
    waiting_for_user_id <> user_id and
    status = 'PLANNED' and
    time is null
  )
);

create index meal_entries_waiting_for_user_idx
on public.meal_entries(waiting_for_user_id)
where waiting_for_user_id is not null;

create or replace function public.validate_waiting_target()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.waiting_for_user_id is not null and not public.is_group_member(new.group_id, new.waiting_for_user_id) then
    raise exception 'Waiting target must be a member of the same group';
  end if;
  return new;
end;
$$;

create trigger meal_entries_validate_waiting_target
before insert or update on public.meal_entries
for each row execute function public.validate_waiting_target();
