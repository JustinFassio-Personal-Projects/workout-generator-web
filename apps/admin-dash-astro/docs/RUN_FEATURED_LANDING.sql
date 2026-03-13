-- Phase 3: Add featured_on_landing and challenges public read.
-- Run in Supabase SQL Editor against the same project used by admin-dash-astro and astro-site.
-- Safe to run multiple times (idempotent).

-- 1. programs: add featured_on_landing
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

-- 2. programs: allow public read of featured (for homepage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Anyone can read featured programs') THEN
    CREATE POLICY "Anyone can read featured programs" ON public.programs
      FOR SELECT USING (featured_on_landing = true);
  END IF;
END $$;

-- 3. challenges: add featured_on_landing
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

-- 4. challenges: add public read for published (astro-site homepage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Anyone can read published challenges') THEN
    CREATE POLICY "Anyone can read published challenges" ON public.challenges
      FOR SELECT USING (status = 'published');
  END IF;
END $$;
