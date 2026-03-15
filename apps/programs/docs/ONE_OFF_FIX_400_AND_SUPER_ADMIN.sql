-- One-off: fix 400 on user_programs (add missing source column) and set super admin.
-- Run in Supabase SQL Editor for the project used by programs-admin.

-- 1. Fix 400 Bad Request: client selects "source"; column must exist (see 00063_user_programs_source.sql).
ALTER TABLE public.user_programs
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'self'
  CHECK (source IN ('self', 'trainer_assigned', 'cohort'));
UPDATE public.user_programs SET source = 'self' WHERE source IS NULL;
ALTER TABLE public.user_programs ALTER COLUMN source SET NOT NULL;

-- 2. Set this user as super admin (programs app uses only profiles.role; no admin_users table).
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'd5c04a57-9724-45c9-9eb1-552806359b52';

-- If the user has no profile row yet (e.g. backfill missed them), uncomment and run instead:
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES ('d5c04a57-9724-45c9-9eb1-552806359b52', 'justin@aiworkoutgen.app', 'Justin Fassio', 'admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email, full_name = EXCLUDED.full_name;
