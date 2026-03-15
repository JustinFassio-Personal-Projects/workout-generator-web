-- One-off: fix 400 on user_programs (add missing source column) and set super admin.
-- Run in Supabase SQL Editor for the project used by programs-admin.

-- 1. Fix 400 Bad Request: client selects "source"; column must exist (see 00063_user_programs_source.sql).
ALTER TABLE public.user_programs
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'self'
  CHECK (source IN ('self', 'trainer_assigned', 'cohort'));
UPDATE public.user_programs SET source = 'self' WHERE source IS NULL;
ALTER TABLE public.user_programs ALTER COLUMN source SET NOT NULL;

-- 2. Set your user as super admin (programs app uses only profiles.role; no admin_users table).
-- Replace YOUR_USER_UUID with your user id from Supabase -> Authentication -> Users.
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_UUID';

-- If the user has no profile row yet (e.g. backfill missed them), uncomment and run instead (replace placeholders):
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES ('YOUR_USER_UUID', 'your@email.example', 'Your Name', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, full_name = EXCLUDED.full_name;
