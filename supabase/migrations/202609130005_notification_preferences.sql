create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  weekly_review_enabled boolean not null default true,
  daily_lunch_summary_enabled boolean not null default true,
  participation_reminder_enabled boolean not null default true,
  dinner_summary_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "users read own notification preferences"
on public.notification_preferences for select to authenticated
using (user_id = auth.uid());

create policy "users create own notification preferences"
on public.notification_preferences for insert to authenticated
with check (user_id = auth.uid());

create policy "users update own notification preferences"
on public.notification_preferences for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
