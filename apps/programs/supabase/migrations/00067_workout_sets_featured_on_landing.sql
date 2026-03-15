-- Add featured_on_landing flag to workout_sets for homepage display (Phase 3: Surface Workout Factory Content).
-- Constraint: featured_on_landing cannot be true unless status = 'published'.

ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

UPDATE public.workout_sets SET featured_on_landing = false WHERE featured_on_landing = true AND status != 'published';

ALTER TABLE public.workout_sets ADD CONSTRAINT workout_sets_featured_requires_published
  CHECK (NOT featured_on_landing OR status = 'published');
