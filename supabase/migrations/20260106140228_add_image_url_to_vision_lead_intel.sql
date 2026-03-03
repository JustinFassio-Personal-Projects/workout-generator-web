-- Migration: Add image_url to vision_lead_intel table
-- Description: Adds image_url column to store the URL of the generated Vision Lab image

-- ============================================================================
-- ADD IMAGE_URL COLUMN
-- ============================================================================

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vision_lead_intel' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE vision_lead_intel ADD COLUMN image_url TEXT;
  END IF;
END $$;
-- ============================================================================
-- INDEX FOR PERFORMANCE (optional, but helpful if querying by image_url)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vision_lead_intel_image_url ON vision_lead_intel(image_url) WHERE image_url IS NOT NULL;
