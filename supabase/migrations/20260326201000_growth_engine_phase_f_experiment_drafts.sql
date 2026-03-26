-- Growth Engine Phase F: experiment drafts backing table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.growth_experiment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'archived')),
  title TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  primary_metric TEXT NOT NULL,
  primary_page TEXT NOT NULL,
  message_variant TEXT,
  linked_suggestion_id TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_growth_experiment_drafts_created_at
  ON public.growth_experiment_drafts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_experiment_drafts_status
  ON public.growth_experiment_drafts (status, created_at DESC);

ALTER TABLE public.growth_experiment_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS growth_experiment_drafts_admin_read ON public.growth_experiment_drafts;
CREATE POLICY growth_experiment_drafts_admin_read
  ON public.growth_experiment_drafts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS growth_experiment_drafts_service_role_manage ON public.growth_experiment_drafts;
CREATE POLICY growth_experiment_drafts_service_role_manage
  ON public.growth_experiment_drafts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
