-- Migration: Create Vision Lead Intel Schema
-- Description: Creates vision_lead_intel table for micro-interview responses and updates leads table with consent_email_plan field

-- ============================================================================
-- UPDATE LEADS TABLE
-- ============================================================================

-- Add consent_email_plan column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'consent_email_plan'
  ) THEN
    ALTER TABLE leads ADD COLUMN consent_email_plan BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
-- ============================================================================
-- VISION_LEAD_INTEL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vision_lead_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  vision_prompt TEXT,
  goal_primary TEXT NOT NULL,
  frustration_primary TEXT NOT NULL,
  ai_expectation_primary TEXT NOT NULL,
  payment_trigger_primary TEXT,
  expectation_free_text TEXT,
  exercise_suggestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vision_lead_intel_lead_id ON vision_lead_intel(lead_id);
CREATE INDEX IF NOT EXISTS idx_vision_lead_intel_created_at ON vision_lead_intel(created_at DESC);
-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on vision_lead_intel table
ALTER TABLE vision_lead_intel ENABLE ROW LEVEL SECURITY;
-- ============================================================================
-- VISION_LEAD_INTEL POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can insert vision lead intel" ON vision_lead_intel;
DROP POLICY IF EXISTS "Public can read vision lead intel" ON vision_lead_intel;
-- Public can insert vision lead intel (for micro-interview responses)
CREATE POLICY "Public can insert vision lead intel"
  ON vision_lead_intel
  FOR INSERT
  TO public
  WITH CHECK (true);
-- Public can read their own vision lead intel (by lead_id)
-- For now, allow public read for MVP (can restrict later for admin-only)
CREATE POLICY "Public can read vision lead intel"
  ON vision_lead_intel
  FOR SELECT
  TO public
  USING (true);
