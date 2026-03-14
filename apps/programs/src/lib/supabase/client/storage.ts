/**
 * Client-side Supabase Storage upload helpers.
 * Phase 2 data layer for uploads; Phase 3 will switch components from Firebase storage to these.
 */

import { supabase } from '../client';
import { dataUrlToBlob } from '@/lib/data-url-to-blob';

const BUCKET_IMAGES = 'exercise-images';

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
}

/**
 * Upload an exercise image to Supabase Storage. Returns public URL and path.
 * Use for exercise images (primary, gallery, etc.).
 */
export async function uploadExerciseImage(
  file: File | Blob,
  storagePath: string,
  contentType?: string
): Promise<UploadResult> {
  const ct = contentType ?? (file instanceof File ? file.type : 'image/png');
  const { data, error } = await supabase.storage
    .from(BUCKET_IMAGES)
    .upload(storagePath, file, { contentType: ct, upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET_IMAGES).getPublicUrl(data.path);
  return {
    downloadUrl: urlData.publicUrl,
    storagePath: data.path,
  };
}

/**
 * Upload an exercise video to Supabase Storage. Returns public URL and path.
 * Uses same bucket as images (exercise-images) with path e.g. generated-exercises/{id}/video/...
 */
export async function uploadExerciseVideo(
  file: File | Blob,
  storagePath: string
): Promise<UploadResult> {
  const contentType = file instanceof File ? file.type : 'video/mp4';
  const { data, error } = await supabase.storage
    .from(BUCKET_IMAGES)
    .upload(storagePath, file, { contentType, upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET_IMAGES).getPublicUrl(data.path);
  return {
    downloadUrl: urlData.publicUrl,
    storagePath: data.path,
  };
}

/**
 * Upload a personalized exercise image to user-scoped storage.
 * Path: user-content/{userId}/personalized-exercise-{exerciseSlug}-{timestamp}.png
 */
export async function uploadPersonalizedExerciseImage(
  userId: string,
  exerciseSlug: string,
  imageDataUrl: string
): Promise<UploadResult> {
  const blob = dataUrlToBlob(imageDataUrl);
  const path = `user-content/${userId}/personalized-exercise-${exerciseSlug}-${Date.now()}.png`;
  return uploadExerciseImage(blob, path, 'image/png');
}
