-- Muscle engagement map for Deep Dive: structured data (view + muscle IDs and roles)
-- Rendered by the app from curated SVG assets; AI only outputs this JSON.
ALTER TABLE public.generated_exercises
  ADD COLUMN IF NOT EXISTS muscle_engagement_map jsonb;
