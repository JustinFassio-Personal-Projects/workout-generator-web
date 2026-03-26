-- Growth Engine Phase C: daily brief and realtime alerts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.daily_brief (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rule_pack_version TEXT NOT NULL,
  insight_run_id TEXT NOT NULL,
  summary JSONB NOT NULL,
  metrics JSONB,
  source TEXT NOT NULL DEFAULT 'batch'
);

CREATE INDEX IF NOT EXISTS idx_daily_brief_generated_at
  ON public.daily_brief (generated_at DESC);

CREATE TABLE IF NOT EXISTS public.growth_realtime_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  alert_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  user_id TEXT,
  severity TEXT NOT NULL DEFAULT 'P2',
  payload JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'poller'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_realtime_alerts_dedupe
  ON public.growth_realtime_alerts (alert_type, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_growth_realtime_alerts_active
  ON public.growth_realtime_alerts (resolved_at, created_at DESC);

ALTER TABLE public.daily_brief ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_realtime_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_brief_admin_read ON public.daily_brief;
CREATE POLICY daily_brief_admin_read
  ON public.daily_brief
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS growth_realtime_alerts_admin_read ON public.growth_realtime_alerts;
CREATE POLICY growth_realtime_alerts_admin_read
  ON public.growth_realtime_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.id = auth.uid()
    )
  );
