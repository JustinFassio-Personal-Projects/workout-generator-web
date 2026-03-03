-- Restrict vision_lead_intel SELECT to admins (was public read for MVP).
-- Table holds micro-interview responses and is linked to leads via lead_id; public read can leak sensitive data.
-- Public keeps INSERT for the micro-interview flow; only admin_users can read.
-- Requires admin_users table (from 20260104082749 or equivalent).

DROP POLICY IF EXISTS "Public can read vision lead intel" ON public.vision_lead_intel;

CREATE POLICY "Admins can read vision lead intel"
  ON public.vision_lead_intel
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
  );
