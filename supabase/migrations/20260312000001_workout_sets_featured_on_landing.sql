-- Add featured_on_landing to workout_sets (Workout Factory). Constraint: featured only if status = 'published'.
-- Run in the Supabase project used by admin-dash-astro (PUBLIC_SUPABASE_URL).

ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

UPDATE public.workout_sets SET featured_on_landing = false WHERE featured_on_landing = true AND (status IS DISTINCT FROM 'published');

ALTER TABLE public.workout_sets DROP CONSTRAINT IF EXISTS workout_sets_featured_requires_published;
ALTER TABLE public.workout_sets ADD CONSTRAINT workout_sets_featured_requires_published
  CHECK (NOT featured_on_landing OR status = 'published');
