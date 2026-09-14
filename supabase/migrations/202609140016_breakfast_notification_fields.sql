alter type public.notification_type add value if not exists 'DAILY_BREAKFAST_SUMMARY';

alter table public.notification_preferences
add column daily_breakfast_summary_enabled boolean not null default false;
