-- Migration: Create Exercise Challenge Schema
-- Description: Creates tables for lead capture and exercise submissions for the Exercise Challenge feature
-- Includes RLS policies, indexes, and constraints

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LEADS TABLE
-- ============================================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'exercise_challenge',
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  referrer TEXT,
  consent_follow_up BOOLEAN NOT NULL DEFAULT false,
  coaching_interest BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- EXERCISE_SUBMISSIONS TABLE
-- ============================================================================
CREATE TYPE exercise_status AS ENUM ('new', 'reviewing', 'accepted', 'rejected');
CREATE TYPE exercise_category AS ENUM ('strength', 'conditioning', 'mobility', 'skill', 'recovery');
CREATE TYPE equipment_type AS ENUM ('none', 'db', 'bb', 'kb', 'bands', 'machine', 'other');
CREATE TYPE movement_pattern AS ENUM ('squat', 'hinge', 'push', 'pull', 'carry', 'rotation', 'locomotion');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TABLE exercise_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  category exercise_category NOT NULL,
  equipment equipment_type NOT NULL,
  primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  movement_pattern movement_pattern NOT NULL,
  difficulty difficulty_level NOT NULL,
  technique_cues TEXT NOT NULL,
  safety_notes TEXT,
  regression TEXT,
  progression TEXT,
  mistakes TEXT,
  contraindications TEXT,
  rationale TEXT,
  vision_prompt TEXT,
  status exercise_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Leads indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Exercise submissions indexes
CREATE INDEX idx_exercise_submissions_lead_id ON exercise_submissions(lead_id);
CREATE INDEX idx_exercise_submissions_status ON exercise_submissions(status);
CREATE INDEX idx_exercise_submissions_category ON exercise_submissions(category);
CREATE INDEX idx_exercise_submissions_created_at ON exercise_submissions(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LEADS POLICIES
-- ============================================================================

-- Public can insert leads (for lead capture)
CREATE POLICY "Public can insert leads"
  ON leads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can read their own lead (by email, but we'll restrict this in practice)
-- For now, allow public read for MVP (can restrict later for admin-only)
CREATE POLICY "Public can read leads"
  ON leads
  FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- EXERCISE_SUBMISSIONS POLICIES
-- ============================================================================

-- Public can insert exercise submissions (linked to their lead)
CREATE POLICY "Public can insert exercise submissions"
  ON exercise_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can read their own submissions (by lead_id)
-- For now, allow public read for MVP (can restrict later for admin-only)
CREATE POLICY "Public can read exercise submissions"
  ON exercise_submissions
  FOR SELECT
  TO public
  USING (true);
