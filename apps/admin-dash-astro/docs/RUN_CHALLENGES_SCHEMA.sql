-- Challenge Factory: challenges + challenge_weeks tables for admin-dash-astro.
-- Run this in Supabase SQL Editor against the same project used by admin-dash-astro (and programs app).
-- Safe to run multiple times (idempotent).

-- 1. Create challenges table if not exists
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  config jsonb,
  chain_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add image columns (from programs 00055_challenges_images.sql)
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS section_images jsonb DEFAULT '{}';

-- 3. Create challenge_weeks table if not exists
CREATE TABLE IF NOT EXISTS public.challenge_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  content jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, week_number)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_created_at ON public.challenges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_status_created ON public.challenges(status, created_at DESC);

-- 5. Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_weeks ENABLE ROW LEVEL SECURITY;

-- 6. Policy: authors can manage own challenges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Authors can manage own challenges') THEN
    CREATE POLICY "Authors can manage own challenges" ON public.challenges FOR ALL USING (auth.uid() = author_id);
  END IF;
END $$;

-- 7. Policy: authors can manage challenge_weeks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenge_weeks' AND policyname = 'Authors can manage challenge_weeks') THEN
    CREATE POLICY "Authors can manage challenge_weeks" ON public.challenge_weeks FOR ALL USING (
      EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.author_id = auth.uid())
    );
  END IF;
END $$;
