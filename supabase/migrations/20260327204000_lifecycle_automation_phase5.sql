-- Phase 5: lifecycle automation — send log, idempotency, opt-outs (no email provider wired in-repo).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifecycle_email_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifecycle_push_opt_out BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.lifecycle_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push', 'other')),
  status TEXT NOT NULL CHECK (
    status IN (
      'dry_run',
      'skipped_opt_out',
      'skipped_frequency_cap',
      'skipped_premium',
      'skipped_no_provider',
      'sent'
    )
  ),
  idempotency_key TEXT NOT NULL,
  variant_key TEXT,
  metadata JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_send_log_idempotency_key_uidx
  ON public.lifecycle_send_log (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_lifecycle_send_log_profile_created
  ON public.lifecycle_send_log (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_send_log_campaign_created
  ON public.lifecycle_send_log (campaign_id, created_at DESC);

ALTER TABLE public.lifecycle_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lifecycle_send_log_admin_read ON public.lifecycle_send_log;
CREATE POLICY lifecycle_send_log_admin_read
  ON public.lifecycle_send_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );
