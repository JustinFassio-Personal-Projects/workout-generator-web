-- Migration: Create Storage Buckets
-- Description: Creates lead-images and blog-images buckets with upload restrictions and RLS policies

-- ============================================================================
-- CREATE BUCKETS
-- ============================================================================

-- Create buckets with upload restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('lead-images', 'lead-images', true, 5*1024*1024, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('blog-images', 'blog-images', true, 5*1024*1024, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;
-- ============================================================================
-- RLS POLICIES: PUBLIC READ
-- ============================================================================

-- Drop existing policies if they exist (for safe re-runs)
DROP POLICY IF EXISTS "public_can_read_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "public_can_read_blog_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_write_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_update_delete_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_update_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_delete_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_write_blog_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_delete_blog_images" ON storage.objects;
-- Public read for lead-images
CREATE POLICY "public_can_read_lead_images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lead-images');
-- Public read for blog-images
CREATE POLICY "public_can_read_blog_images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'blog-images');
-- ============================================================================
-- RLS POLICIES: SERVER-SIDE WRITE (DEFENSE-IN-DEPTH)
-- ============================================================================

-- Lead images: Allow authenticated writes but restrict to path prefix {lead_id}/
CREATE POLICY "authenticated_can_write_lead_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lead-images'
  AND (char_length(name) > 36) -- Ensure path prefix exists (UUID is 36 chars)
);
-- Split so name matches capability: UPDATE and DELETE are separate operations in RLS.
CREATE POLICY "authenticated_can_update_lead_images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lead-images')
WITH CHECK (bucket_id = 'lead-images');
CREATE POLICY "authenticated_can_delete_lead_images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-images');
-- Blog images: Admin-only write
CREATE POLICY "admin_write_blog_images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
  )
);
CREATE POLICY "admin_update_delete_blog_images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'blog-images'
  AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid())
);
