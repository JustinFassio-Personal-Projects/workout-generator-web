-- Migration: Create Custom Analytics Schema
-- Description: Adds first-party analytics tables + admin-only read access
-- Notes:
--  - Additive only (no drops / no resets)
--  - Writes happen via service_role in the ingestion API route
--  - Reads are restricted to authenticated users present in admin_users

-- ============================================================================
-- TABLE: analytics_visitors
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_visitors (
  visitor_id UUID PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_visitors_last_seen_at
  ON analytics_visitors (last_seen_at DESC);

-- ============================================================================
-- TABLE: analytics_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id UUID PRIMARY KEY,
  visitor_id UUID NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id
  ON analytics_sessions (visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen_at
  ON analytics_sessions (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at
  ON analytics_sessions (started_at DESC);

-- ============================================================================
-- TABLE: analytics_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor_id UUID NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES analytics_sessions(session_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('page_view', 'click')),
  path TEXT NOT NULL,
  href TEXT,
  referrer TEXT,
  click_name TEXT,
  props JSONB
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at
  ON analytics_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type
  ON analytics_events (type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_path
  ON analytics_events (path);

CREATE INDEX IF NOT EXISTS idx_analytics_events_click_name
  ON analytics_events (click_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id
  ON analytics_events (visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
  ON analytics_events (session_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Admins/editors (any admin_users) can read analytics
CREATE POLICY "Admins can read analytics_visitors"
  ON analytics_visitors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can read analytics_sessions"
  ON analytics_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can read analytics_events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Service role can manage analytics (used by ingestion endpoint)
CREATE POLICY "Service role can manage analytics_visitors"
  ON analytics_visitors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage analytics_sessions"
  ON analytics_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage analytics_events"
  ON analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RPC FUNCTIONS (used by /admin/analytics)
-- ============================================================================

-- Summary metrics for a period
CREATE OR REPLACE FUNCTION analytics_get_summary(period_start TIMESTAMPTZ, period_end TIMESTAMPTZ)
RETURNS TABLE (
  unique_visitors BIGINT,
  sessions BIGINT,
  page_views BIGINT,
  returning_visitors BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(COUNT(DISTINCT e.visitor_id), 0) AS unique_visitors,
    COALESCE(COUNT(DISTINCT e.session_id), 0) AS sessions,
    COALESCE(COUNT(*) FILTER (WHERE e.type = 'page_view'), 0) AS page_views,
    COALESCE(COUNT(DISTINCT e.visitor_id) FILTER (WHERE v.first_seen_at < period_start), 0) AS returning_visitors
  FROM analytics_events e
  JOIN analytics_visitors v ON v.visitor_id = e.visitor_id
  WHERE e.occurred_at >= period_start AND e.occurred_at < period_end;
$$;

-- Top pages by views + unique visitors
CREATE OR REPLACE FUNCTION analytics_get_top_pages(
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  limit_count INT DEFAULT 25
)
RETURNS TABLE (
  path TEXT,
  page_views BIGINT,
  unique_visitors BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.path AS path,
    COUNT(*) FILTER (WHERE e.type = 'page_view') AS page_views,
    COUNT(DISTINCT e.visitor_id) AS unique_visitors
  FROM analytics_events e
  WHERE e.occurred_at >= period_start
    AND e.occurred_at < period_end
    AND e.path IS NOT NULL
  GROUP BY e.path
  ORDER BY page_views DESC, unique_visitors DESC, path ASC
  LIMIT GREATEST(limit_count, 1);
$$;

-- Top clicks by click_name
CREATE OR REPLACE FUNCTION analytics_get_top_clicks(
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  limit_count INT DEFAULT 25
)
RETURNS TABLE (
  click_name TEXT,
  clicks BIGINT,
  unique_visitors BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.click_name AS click_name,
    COUNT(*) AS clicks,
    COUNT(DISTINCT e.visitor_id) AS unique_visitors
  FROM analytics_events e
  WHERE e.occurred_at >= period_start
    AND e.occurred_at < period_end
    AND e.type = 'click'
    AND e.click_name IS NOT NULL
    AND e.click_name <> ''
  GROUP BY e.click_name
  ORDER BY clicks DESC, unique_visitors DESC, click_name ASC
  LIMIT GREATEST(limit_count, 1);
$$;

-- Restrict RPC execution to authenticated users (RLS still enforces admin_users membership)
REVOKE ALL ON FUNCTION analytics_get_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_get_top_pages(TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION analytics_get_top_clicks(TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION analytics_get_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_get_top_pages(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_get_top_clicks(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated;

