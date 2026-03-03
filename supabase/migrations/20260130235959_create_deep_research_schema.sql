-- Migration: Create Deep Research schema
-- Creates deep_research table with RLS, indexes, and updated_at trigger.
-- Idempotent: safe to run when table already exists (e.g. created manually or on another branch).
-- Run before 20260131000000_add_deep_research_metadata.sql (additive columns).

CREATE TABLE IF NOT EXISTS deep_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  html_content TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Indexes for public list/detail and admin list
CREATE INDEX IF NOT EXISTS idx_deep_research_slug ON deep_research(slug);
CREATE INDEX IF NOT EXISTS idx_deep_research_status ON deep_research(status);
CREATE INDEX IF NOT EXISTS idx_deep_research_published_at ON deep_research(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_deep_research_updated_at ON deep_research(updated_at DESC);
-- RLS
ALTER TABLE deep_research ENABLE ROW LEVEL SECURITY;
-- Policies (drop first so migration is idempotent)
DROP POLICY IF EXISTS "Public can read published deep research" ON deep_research;
CREATE POLICY "Public can read published deep research"
  ON deep_research
  FOR SELECT
  TO public
  USING (status = 'published');
DROP POLICY IF EXISTS "Admins can read all deep research" ON deep_research;
CREATE POLICY "Admins can read all deep research"
  ON deep_research
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "Admins can insert deep research" ON deep_research;
CREATE POLICY "Admins can insert deep research"
  ON deep_research
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "Admins can update deep research" ON deep_research;
CREATE POLICY "Admins can update deep research"
  ON deep_research
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
    )
  );
DROP POLICY IF EXISTS "Admins can delete deep research" ON deep_research;
CREATE POLICY "Admins can delete deep research"
  ON deep_research
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.role = 'admin'
    )
  );
-- Trigger: maintain updated_at (reuses function from blog schema migration)
DROP TRIGGER IF EXISTS update_deep_research_updated_at ON deep_research;
CREATE TRIGGER update_deep_research_updated_at
  BEFORE UPDATE ON deep_research
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
