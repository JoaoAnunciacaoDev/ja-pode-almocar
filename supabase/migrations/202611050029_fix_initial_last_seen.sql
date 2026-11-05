-- 1. Remove default now() from last_seen_at so new profiles don't falsely claim access
alter table public.profiles
alter column last_seen_at drop default;

-- 2. Reset last_seen_at to null so historical users only show their actual past activity
-- (the caller's own last_seen_at will be set to now() automatically on their next request/dashboard load)
update public.profiles
set last_seen_at = null;
