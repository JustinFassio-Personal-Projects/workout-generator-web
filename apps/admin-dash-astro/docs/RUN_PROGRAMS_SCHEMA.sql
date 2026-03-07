-- Program Factory: programs + program_weeks tables for admin-dash-astro.
-- Run this in Supabase SQL Editor against the same project used by admin-dash-astro (and programs app).
-- Safe to run multiple times (idempotent).

-- 1. Create programs table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'programs') THEN
    CREATE TABLE public.programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      difficulty text DEFAULT 'intermediate',
      duration_weeks integer DEFAULT 4,
      tags text[] DEFAULT '{}',
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
      is_public boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- 2. Add config and chain_metadata if missing (from programs app migration 00057)
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS config jsonb;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS chain_metadata jsonb;

-- 3. Create program_weeks table if not exists
CREATE TABLE IF NOT EXISTS public.program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  content jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(program_id, week_number)
);

-- 4. Enable RLS on programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- 5. Enable RLS on program_weeks
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;

-- 6. Policy: trainers can manage own programs (required for ProgramLibraryTable fetchPrograms)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Trainers can manage own programs') THEN
    CREATE POLICY "Trainers can manage own programs" ON public.programs FOR ALL USING (auth.uid() = trainer_id);
  END IF;
END $$;

-- 7. Policy: anyone can read public programs (optional; for public catalog)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Anyone can read public programs') THEN
    CREATE POLICY "Anyone can read public programs" ON public.programs FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- 8. Policy: trainers can manage program_weeks for their programs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'program_weeks' AND policyname = 'Trainers can manage program_weeks') THEN
    CREATE POLICY "Trainers can manage program_weeks" ON public.program_weeks FOR ALL USING (
      EXISTS (SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.trainer_id = auth.uid())
    );
  END IF;
END $$;
