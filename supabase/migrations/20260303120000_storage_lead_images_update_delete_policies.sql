-- Fix: split lead-images update/delete into separate RLS policies so name matches capability.
-- For DBs that already ran 20260107084907 with the old single policy.
DROP POLICY IF EXISTS "authenticated_can_update_delete_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_update_lead_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_can_delete_lead_images" ON storage.objects;

CREATE POLICY "authenticated_can_update_lead_images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lead-images')
WITH CHECK (bucket_id = 'lead-images');

CREATE POLICY "authenticated_can_delete_lead_images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-images');
