-- Add 'ALREADY_ATE' status to meal_status enum.
-- Kept in its own migration file because PostgreSQL requires enum additions
-- to be committed before the new enum value can be referenced in constraints.
alter type public.meal_status add value if not exists 'ALREADY_ATE';
