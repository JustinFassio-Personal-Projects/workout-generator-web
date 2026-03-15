-- One-time fix for Supabase projects that have programs/challenges but are missing
-- profiles, user_programs, user_workout_logs, warmup_config, or generated_wods
-- (e.g. 404 "Could not find the table 'public.profiles'" or 404 on generated_wods/warmup_config).
-- Run this in the Supabase SQL Editor for the project used by the programs app (programs-admin).
-- Safe to run if tables already exist (uses IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT DO NOTHING).

-- 1. Profiles (required for auth, admin role, and AppContext)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'trainer', 'admin')),
  purchased_index integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow admins to read all profiles (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

-- Trigger: create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth users (so current admin can log in)
INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url',
  COALESCE(raw_user_meta_data->>'role', 'client')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- After running this script, set your admin user(s) to role 'admin' in the SQL Editor:
--   UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_UUID';
-- (Get YOUR_USER_UUID from Authentication → Users in the Supabase dashboard, or from the 404 URL id=eq.xxx)


-- 2. user_workout_logs (for workout history / dashboard)
CREATE TABLE IF NOT EXISTS public.user_workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id text NOT NULL,
  week_id text NOT NULL,
  workout_id text NOT NULL,
  date date NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  exercises jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_workout_logs_user_date ON public.user_workout_logs(user_id, date DESC);

ALTER TABLE public.user_workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own user_workout_logs" ON public.user_workout_logs;
CREATE POLICY "Users can manage own user_workout_logs" ON public.user_workout_logs FOR ALL USING (auth.uid() = user_id);


-- 2b. workout_logs (for dashboard stats: totalWorkoutsLogged, recentActivity)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id text,
  workout_name text NOT NULL,
  date date NOT NULL,
  effort integer NOT NULL CHECK (effort >= 1 AND effort <= 10),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, date DESC);
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workout_logs" ON public.workout_logs;
CREATE POLICY "Users can manage own workout_logs" ON public.workout_logs FOR ALL USING (auth.uid() = user_id);


-- 3. user_programs (for program enrollments; requires public.programs to exist)
CREATE TABLE IF NOT EXISTS public.user_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  start_date date,
  purchased_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  source text NOT NULL DEFAULT 'self' CHECK (source IN ('self', 'trainer_assigned', 'cohort')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, program_id)
);
-- Add source if table already existed without it (client requires it; avoids 400 on fetchUserPrograms).
ALTER TABLE public.user_programs ADD COLUMN IF NOT EXISTS source text DEFAULT 'self';
UPDATE public.user_programs SET source = 'self' WHERE source IS NULL;
ALTER TABLE public.user_programs ALTER COLUMN source SET NOT NULL;

ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own user_programs" ON public.user_programs;
CREATE POLICY "Users can manage own user_programs" ON public.user_programs FOR ALL USING (auth.uid() = user_id);


-- 4. warmup_config (Daily Warm-Up; single row id=default)
CREATE TABLE IF NOT EXISTS public.warmup_config (
  id text PRIMARY KEY DEFAULT 'default',
  slots jsonb NOT NULL DEFAULT '[]',
  duration_per_exercise integer NOT NULL DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.warmup_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read warmup_config" ON public.warmup_config;
CREATE POLICY "Authenticated can read warmup_config" ON public.warmup_config FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admin can update warmup_config" ON public.warmup_config;
CREATE POLICY "Admin can update warmup_config" ON public.warmup_config FOR UPDATE USING (public.get_my_role() = 'admin');
DROP POLICY IF EXISTS "Admin can insert warmup_config" ON public.warmup_config;
CREATE POLICY "Admin can insert warmup_config" ON public.warmup_config FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
INSERT INTO public.warmup_config (id, slots, duration_per_exercise, updated_at)
VALUES ('default', '[]', 30, now())
ON CONFLICT (id) DO NOTHING;


-- 5. generated_wods (WOD list view; avoids 404 when toggling to WODs)
CREATE TABLE IF NOT EXISTS public.generated_wods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level text,
  workout_detail jsonb,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved'));
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS name text DEFAULT '';
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS genre text DEFAULT '';
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS image text DEFAULT '';
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS day text DEFAULT 'WOD';
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS intensity integer NOT NULL DEFAULT 3;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS exercise_overrides jsonb;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS iteration jsonb;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS parameters jsonb;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS resolved_format jsonb;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS target_volume_minutes integer;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS window_minutes integer;
ALTER TABLE public.generated_wods ADD COLUMN IF NOT EXISTS rest_load text;
CREATE INDEX IF NOT EXISTS idx_generated_wods_status_created ON public.generated_wods(status, created_at DESC);
ALTER TABLE public.generated_wods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read generated_wods" ON public.generated_wods;
CREATE POLICY "Authenticated can read generated_wods" ON public.generated_wods FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can manage own generated_wods" ON public.generated_wods;
CREATE POLICY "Authenticated can manage own generated_wods" ON public.generated_wods FOR ALL USING (auth.uid() = author_id);
