-- Admin-dash-astro Analytics (Option B): funnel events in a dedicated table so it coexists
-- with the existing analytics_events (20260118 custom schema). Run in the Supabase project
-- used by this app (see PUBLIC_SUPABASE_URL in .env).
-- Events: timer_session_complete, account_signup_complete, account_login_complete, etc.

CREATE TABLE IF NOT EXISTS public.analytics_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  properties jsonb DEFAULT '{}',
  app_id text
);

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_events_event_timestamp
  ON public.analytics_funnel_events (event_name, "timestamp");

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_events_user_timestamp
  ON public.analytics_funnel_events (user_id, "timestamp")
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_events_session_timestamp
  ON public.analytics_funnel_events (session_id, "timestamp")
  WHERE session_id IS NOT NULL;

ALTER TABLE public.analytics_funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_funnel_events_insert_anon ON public.analytics_funnel_events;
CREATE POLICY analytics_funnel_events_insert_anon
  ON public.analytics_funnel_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS analytics_funnel_events_insert_authenticated ON public.analytics_funnel_events;
CREATE POLICY analytics_funnel_events_insert_authenticated
  ON public.analytics_funnel_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
