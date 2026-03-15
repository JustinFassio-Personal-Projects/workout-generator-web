-- Verification script for migration: 20260312000000_add_featured_on_landing
-- Run this in the Supabase SQL Editor for the project used by astro-site and admin-dash-astro.
-- All three checks should return rows; if any is empty, the migration may not be applied.

-- 1. Column exists on programs
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'programs' AND column_name = 'featured_on_landing';

-- 2. Constraint: featured implies is_public
SELECT conname AS constraint_name
FROM pg_constraint
WHERE conrelid = 'public.programs'::regclass AND conname = 'programs_featured_requires_public';

-- 3. RLS policy: anyone can read featured+public programs
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'programs' AND policyname = 'Anyone can read featured programs';

-- RLS note: astro-site getFeaturedPrograms() uses anon key with
-- .eq('featured_on_landing', true).eq('is_public', true). This policy
-- (or "Anyone can read public programs" via is_public) allows that query.

-- --- Challenges (Phase 2) ---

-- 4. Column exists on challenges
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'featured_on_landing';

-- 5. RLS policy: anyone can read published challenges
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'challenges' AND policyname = 'Anyone can read published challenges';

-- RLS note: astro-site getFeaturedChallenges() uses anon key with
-- .eq('featured_on_landing', true).eq('status', 'published'). The policy
-- "Anyone can read published challenges" (status = 'published') allows that query.

-- --- Workout sets (Phase 3) ---

-- 6. Column exists on workout_sets
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workout_sets' AND column_name = 'featured_on_landing';

-- 7. Constraint: featured implies published
SELECT conname AS constraint_name
FROM pg_constraint
WHERE conrelid = 'public.workout_sets'::regclass AND conname = 'workout_sets_featured_requires_published';

-- RLS note: "Anyone can read published workout_sets" (status = 'published') already exists
-- in 00056_workout_sets.sql. astro-site getFeaturedWorkouts() uses anon key with
-- .eq('featured_on_landing', true).eq('status', 'published').
