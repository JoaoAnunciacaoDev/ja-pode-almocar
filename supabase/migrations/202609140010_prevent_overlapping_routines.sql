create extension if not exists btree_gist;

alter table public.meal_routines
  add constraint meal_routines_no_overlapping_periods
  exclude using gist (
    group_id with =,
    user_id with =,
    weekday with =,
    meal_type with =,
    daterange(start_date, end_date, '[]') with &&
  );

