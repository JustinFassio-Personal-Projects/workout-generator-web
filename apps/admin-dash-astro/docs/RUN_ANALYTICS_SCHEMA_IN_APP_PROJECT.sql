-- =============================================================================
-- Run this in the Supabase project that your app uses (PUBLIC_SUPABASE_URL).
-- Doc reference only: for admin-dash-astro that project is qbklyimfazrkutwqictw
-- (app at runtime uses env, no hardcoded URLs in code).
--
-- In Supabase Dashboard: select that project → SQL Editor → New query
-- Paste this entire file and run it. Then: Project Settings → API → "Reload schema cache".
-- =============================================================================

-- 1. web_events (required for get_acquisition_stats)
CREATE TABLE IF NOT EXISTS public.web_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL DEFAULT 'page_view',
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path text NOT NULL,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  ip_country text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  properties jsonb DEFAULT '{}',
  app_id text
);
CREATE INDEX IF NOT EXISTS idx_web_events_occurred_at ON public.web_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_web_events_session_occurred ON public.web_events (session_id, occurred_at) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_web_events_user_occurred ON public.web_events (user_id, occurred_at) WHERE user_id IS NOT NULL;
ALTER TABLE public.web_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS web_events_insert_anon ON public.web_events;
CREATE POLICY web_events_insert_anon ON public.web_events FOR INSERT TO anon WITH CHECK (user_id IS NULL);
DROP POLICY IF EXISTS web_events_insert_authenticated ON public.web_events;
CREATE POLICY web_events_insert_authenticated ON public.web_events FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2. analytics_funnel_events
CREATE TABLE IF NOT EXISTS public.analytics_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  properties jsonb DEFAULT '{}',
  app_id text
);
CREATE INDEX IF NOT EXISTS idx_analytics_funnel_events_event_timestamp ON public.analytics_funnel_events (event_name, "timestamp");
CREATE INDEX IF NOT EXISTS idx_analytics_funnel_events_user_timestamp ON public.analytics_funnel_events (user_id, "timestamp") WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_funnel_events_session_timestamp ON public.analytics_funnel_events (session_id, "timestamp") WHERE session_id IS NOT NULL;
ALTER TABLE public.analytics_funnel_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analytics_funnel_events_insert_anon ON public.analytics_funnel_events;
CREATE POLICY analytics_funnel_events_insert_anon ON public.analytics_funnel_events FOR INSERT TO anon WITH CHECK (user_id IS NULL);
DROP POLICY IF EXISTS analytics_funnel_events_insert_authenticated ON public.analytics_funnel_events;
CREATE POLICY analytics_funnel_events_insert_authenticated ON public.analytics_funnel_events FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 3. errors_frontend
CREATE TABLE IF NOT EXISTS public.errors_frontend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  stack text,
  page text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  properties jsonb DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_errors_frontend_occurred_at ON public.errors_frontend (occurred_at);
CREATE INDEX IF NOT EXISTS idx_errors_frontend_page_occurred_at ON public.errors_frontend (page, occurred_at);
ALTER TABLE public.errors_frontend ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS errors_frontend_insert_anon ON public.errors_frontend;
CREATE POLICY errors_frontend_insert_anon ON public.errors_frontend FOR INSERT TO anon WITH CHECK (user_id IS NULL);
DROP POLICY IF EXISTS errors_frontend_insert_authenticated ON public.errors_frontend;
CREATE POLICY errors_frontend_insert_authenticated ON public.errors_frontend FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 4. get_acquisition_stats RPC (depends on web_events)
CREATE OR REPLACE FUNCTION public.get_acquisition_stats(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_ts timestamptz;
  to_ts timestamptz := now();
  result jsonb;
BEGIN
  from_ts := to_ts - (p_days * interval '1 day');
  WITH params AS (SELECT from_ts AS f, to_ts AS t),
  events AS (
    SELECT
      date_trunc('day', occurred_at)::date AS day,
      coalesce(user_id::text, session_id) AS visitor_key,
      path, referrer, utm_source, utm_medium, utm_campaign, user_agent, ip_country,
      session_id, occurred_at,
      row_number() OVER (PARTITION BY session_id ORDER BY occurred_at ASC) AS rn
    FROM web_events
    WHERE occurred_at >= (SELECT f FROM params) AND occurred_at <= (SELECT t FROM params)
  ),
  visitors_by_day AS (
    SELECT to_char(day, 'YYYY-MM-DD') AS date, count(DISTINCT visitor_key) AS count
    FROM events GROUP BY day ORDER BY day
  ),
  referrers AS (
    SELECT referrer, count(*) AS count FROM events
    WHERE referrer IS NOT NULL AND referrer <> '' GROUP BY referrer ORDER BY count DESC LIMIT 20
  ),
  utm AS (
    SELECT coalesce(utm_source, '(none)') AS source, coalesce(utm_medium, '(none)') AS medium,
           coalesce(utm_campaign, '(none)') AS campaign, count(*) AS count
    FROM events GROUP BY utm_source, utm_medium, utm_campaign ORDER BY count DESC
  ),
  landing AS (
    SELECT path, count(*) AS count FROM events WHERE rn = 1 GROUP BY path ORDER BY count DESC LIMIT 20
  ),
  geo AS (
    SELECT coalesce(ip_country, '(unknown)') AS country, count(*) AS count
    FROM events WHERE ip_country IS NOT NULL AND ip_country <> '' GROUP BY ip_country ORDER BY count DESC LIMIT 20
  )
  SELECT jsonb_build_object(
    'uniqueVisitorsByDay', (SELECT jsonb_agg(jsonb_build_object('date', date, 'count', count) ORDER BY date) FROM visitors_by_day),
    'topReferrers', (SELECT jsonb_agg(jsonb_build_object('referrer', referrer, 'count', count)) FROM referrers),
    'utmBreakdown', (SELECT jsonb_agg(jsonb_build_object('source', source, 'medium', medium, 'campaign', campaign, 'count', count)) FROM utm),
    'topLandingPages', (SELECT jsonb_agg(jsonb_build_object('path', path, 'count', count)) FROM landing),
    'geo', (SELECT jsonb_agg(jsonb_build_object('country', country, 'count', count)) FROM geo)
  ) INTO result;
  result := result || jsonb_build_object('deviceBrowser', '[]'::jsonb);
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_acquisition_stats(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_acquisition_stats(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_acquisition_stats(int) TO anon;

-- 5. Expose tables/functions to PostgREST (schema cache)
-- In Supabase hosted, new objects are usually visible after a short delay.
-- If the API still returns "not found in schema cache", go to:
-- Project Settings → API → click "Reload schema cache" (or wait a few minutes).
