-- Admin-dash-astro Analytics: activation/funnel events table.
-- Run in the Supabase project used by this app (see PUBLIC_SUPABASE_URL in .env).
-- Events: timer_session_complete, timer_save_click, account_land_handoff, account_signup_complete, etc.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  properties jsonb DEFAULT '{}',
  app_id text
);

-- Indexes for funnel queries (skip if table has different schema, e.g. from 20260118 custom analytics)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_events' AND column_name = 'event_name') THEN
    CREATE INDEX IF NOT EXISTS idx_analytics_events_event_timestamp ON public.analytics_events (event_name, "timestamp");
    CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON public.analytics_events (user_id, "timestamp") WHERE user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_analytics_events_session_timestamp ON public.analytics_events (session_id, "timestamp") WHERE session_id IS NOT NULL;
  END IF;
END $$;

-- RLS: allow INSERT for anon and authenticated; SELECT only via service role
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_insert_anon ON public.analytics_events;
CREATE POLICY analytics_events_insert_anon
  ON public.analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS analytics_events_insert_authenticated ON public.analytics_events;
CREATE POLICY analytics_events_insert_authenticated
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
