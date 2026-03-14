-- Add featured_on_landing flag to programs and challenges for homepage display.
-- Phase 3: Featured Content on astro-site Landing.

-- 1. programs: add featured_on_landing
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

-- 2. programs: enforce that only public programs can be featured (prevents inconsistent states)
-- First clear any featured flag on non-public programs so the constraint can be added.
UPDATE public.programs SET featured_on_landing = false WHERE featured_on_landing = true AND (is_public = false OR is_public IS NULL);
ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_featured_requires_public;
ALTER TABLE public.programs ADD CONSTRAINT programs_featured_requires_public CHECK (NOT featured_on_landing OR is_public = true);

-- 3. programs: allow public read of featured+public programs (for homepage)
DROP POLICY IF EXISTS "Anyone can read featured programs" ON public.programs;
CREATE POLICY "Anyone can read featured programs" ON public.programs
  FOR SELECT USING (featured_on_landing = true AND is_public = true);

-- 4. challenges: add featured_on_landing
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

-- 5. challenges: add public read for published (required for astro-site homepage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Anyone can read published challenges') THEN
    CREATE POLICY "Anyone can read published challenges" ON public.challenges
      FOR SELECT USING (status = 'published');
  END IF;
END $$;
