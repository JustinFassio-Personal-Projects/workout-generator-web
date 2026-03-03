-- Restrict exercise_submissions SELECT to admins (was public read for MVP).
-- Submissions are linked to leads (lead_id); public read can expose sensitive data.
-- Public keeps INSERT for lead capture; only admin_users can read submissions.
-- Requires admin_users table (from 20260104082749 or equivalent).

DROP POLICY IF EXISTS "Public can read exercise submissions" ON public.exercise_submissions;

CREATE POLICY "Admins can read exercise submissions"
  ON public.exercise_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
  );
