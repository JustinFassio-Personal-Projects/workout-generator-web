-- Restrict leads SELECT to admins (was public read for MVP).
-- leads contains PII (email, first_name); public read exposed all rows to anon.
-- Public keeps INSERT for lead capture; only admin_users can read leads.
-- Requires admin_users table (from 20260104082749 or equivalent).

DROP POLICY IF EXISTS "Public can read leads" ON public.leads;

CREATE POLICY "Admins can read leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
  );
