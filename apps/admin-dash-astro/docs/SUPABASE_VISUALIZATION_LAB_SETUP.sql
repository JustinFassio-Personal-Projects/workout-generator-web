-- Visualization Lab: tables + storage bucket for admin-dash-astro
-- Run this ENTIRE script once in: Supabase Dashboard → SQL Editor → New query
-- Project must match your PUBLIC_SUPABASE_URL (e.g. qbklyimfazrkutwqictw.supabase.co)
-- Idempotent: safe to run again (IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS).

-- 1. Table: generated_exercises (must exist before exercise_images)
CREATE TABLE IF NOT EXISTS public.generated_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  exercise_name text NOT NULL,
  image_url text,
  storage_path text,
  kinetic_chain_type text,
  biomechanics jsonb,
  image_prompt text,
  complexity_level text,
  visual_style text,
  sources jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  generated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  deep_dive_html_content text,
  suitable_blocks text[],
  main_workout_type text,
  video_url text,
  video_storage_path text,
  videos jsonb DEFAULT '[]'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_exercises_slug_status
  ON public.generated_exercises(slug, status) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_generated_exercises_status_created
  ON public.generated_exercises(status, created_at DESC);

-- 2. Table: exercises (manual exercise library; used by Exercise Library + Manually Added tabs)
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('strength', 'cardio', 'mobility')),
  muscle_groups text[] DEFAULT '{}',
  video_url text,
  default_equipment text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. Table: exercise_images (references generated_exercises)
CREATE TABLE IF NOT EXISTS public.exercise_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.generated_exercises(id) ON DELETE CASCADE,
  role text NOT NULL,
  image_url text NOT NULL,
  storage_path text NOT NULL,
  image_prompt text,
  visual_style text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  position integer DEFAULT 0,
  anatomical_section text,
  hidden boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_exercise_images_exercise_id
  ON public.exercise_images(exercise_id, position);

-- 4. RLS
ALTER TABLE public.generated_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- 5. Policies: exercises (for Exercise Library + Manually Added tabs)
DROP POLICY IF EXISTS "Authenticated can read exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated can manage exercises" ON public.exercises;
CREATE POLICY "Authenticated can read exercises" ON public.exercises
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can manage exercises" ON public.exercises
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Policies: generated_exercises (drop first so re-run is safe)
DROP POLICY IF EXISTS "Anyone can read approved exercises" ON public.generated_exercises;
DROP POLICY IF EXISTS "Authenticated can manage exercises" ON public.generated_exercises;
CREATE POLICY "Anyone can read approved exercises" ON public.generated_exercises
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Authenticated can manage exercises" ON public.generated_exercises
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Policies: exercise_images
DROP POLICY IF EXISTS "Authenticated can manage exercise_images" ON public.exercise_images;
CREATE POLICY "Authenticated can manage exercise_images" ON public.exercise_images
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Storage bucket (public so image URLs work)
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('exercise-images', 'exercise-images', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 9. Storage policies (owner-scoped: match apps/programs 00061/00062 so users cannot overwrite/delete each other's uploads)
DROP POLICY IF EXISTS "Allow authenticated uploads to exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete exercise-images" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to exercise-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exercise-images' AND owner_id = auth.uid()::text);

CREATE POLICY "Allow authenticated select exercise-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'exercise-images' AND owner_id = auth.uid()::text);

CREATE POLICY "Allow authenticated update exercise-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'exercise-images' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'exercise-images' AND owner_id = auth.uid()::text);

CREATE POLICY "Allow authenticated delete exercise-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exercise-images' AND owner_id = auth.uid()::text);

-- 10. Public read for storage (bucket is public; anon can read for display)
DROP POLICY IF EXISTS "Public read exercise-images" ON storage.objects;
CREATE POLICY "Public read exercise-images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'exercise-images');

-- 11. User-friendly instructions (AI-generated plain-language; shown on public exercise page)
ALTER TABLE public.generated_exercises
  ADD COLUMN IF NOT EXISTS user_friendly_instructions text;
