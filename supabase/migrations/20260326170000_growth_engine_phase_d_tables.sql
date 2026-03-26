-- Growth Engine Phase D: growth_state prerequisite + scoring spec + export audit.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS growth_state TEXT,
  ADD COLUMN IF NOT EXISTS growth_state_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_growth_state_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_growth_state_check
      CHECK (
        growth_state IS NULL OR growth_state IN (
          'trial_active',
          'trial_expiring_24h',
          'downgraded_free',
          'subscriber_active',
          'churned'
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.growth_lead_score_versions (
  version TEXT PRIMARY KEY,
  spec_json JSONB NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_lead_score_versions_effective_at
  ON public.growth_lead_score_versions (effective_at DESC);

ALTER TABLE public.growth_lead_score_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS growth_lead_score_versions_admin_read ON public.growth_lead_score_versions;
CREATE POLICY growth_lead_score_versions_admin_read
  ON public.growth_lead_score_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.growth_pipeline_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  filters_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_growth_pipeline_export_logs_created_at
  ON public.growth_pipeline_export_logs (created_at DESC);

ALTER TABLE public.growth_pipeline_export_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS growth_pipeline_export_logs_admin_read ON public.growth_pipeline_export_logs;
CREATE POLICY growth_pipeline_export_logs_admin_read
  ON public.growth_pipeline_export_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );
