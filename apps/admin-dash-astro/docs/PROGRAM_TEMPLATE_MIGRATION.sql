-- Scaffold-first program generation: program_template (scaffold) + phase_number on program_weeks.
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).

-- 1. Add program_template (scaffold) to programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS program_template jsonb;

-- 2. Add phase_number to program_weeks (nullable for legacy programs)
ALTER TABLE public.program_weeks ADD COLUMN IF NOT EXISTS phase_number integer;
