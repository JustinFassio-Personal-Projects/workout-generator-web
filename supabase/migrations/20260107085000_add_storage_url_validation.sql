-- Migration: Add Storage URL Validation Constraint
-- Description: Adds check constraint to validate image_url format in vision_lead_intel table
-- Allows null, base64 data URLs (temporary for backward compatibility), or Supabase Storage URLs

-- Drop existing constraint if it exists (for safe re-runs)
ALTER TABLE public.vision_lead_intel
  DROP CONSTRAINT IF EXISTS chk_image_url_supabase;
-- Add constraint to validate image_url format
-- Allows null, base64 data URLs (temporary), or Supabase Storage URLs
ALTER TABLE public.vision_lead_intel
  ADD CONSTRAINT chk_image_url_supabase
  CHECK (
    image_url IS NULL
    OR image_url ~ '^data:image/[a-zA-Z0-9+.-]+;base64,'
    OR image_url ~ '^https://[a-zA-Z0-9-]+\\.supabase\\.co/storage/v1/object/(public|sign)/lead-images/.+'
  );
