-- Create tenants table for multi-tenant platform
--
-- DEPENDENCY: This migration requires the admin_users table to exist.
-- The admin_users table is created in migration 20260104082749_create_blog_schema.sql.
-- The RLS policy "Admins can manage tenants" (line 33-41) references admin_users,
-- so this migration must run after the blog schema migration.
--
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  custom_css TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
-- Create indexes for performance
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);
-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Public can read active tenants (for marketing sites)
CREATE POLICY "Public can read active tenants"
  ON tenants FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
-- Admins can manage tenants (full CRUD)
CREATE POLICY "Admins can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
