-- Growth Engine: intervention logs for directive follow-through tracking.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.intervention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  directive_id TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'cohort', 'segment', 'other')),
  target_ids JSONB,
  notes TEXT,
  outcome TEXT
);

CREATE INDEX IF NOT EXISTS idx_intervention_logs_created_at
  ON public.intervention_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_intervention_logs_actor_id
  ON public.intervention_logs (actor_id);

ALTER TABLE public.intervention_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intervention_logs_admin_read ON public.intervention_logs;
CREATE POLICY intervention_logs_admin_read
  ON public.intervention_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );
