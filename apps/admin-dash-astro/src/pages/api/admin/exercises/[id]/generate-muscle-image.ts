/**
 * POST: Generate anatomical muscle diagram image for an exercise (admin only).
 * Uses muscle_engagement_map to build a prompt and generateInfographicImage.
 * Requires GEMINI_API_KEY. Uploads result to Supabase storage and saves URL.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import {
  getGeneratedExerciseById,
  updateGeneratedExerciseMuscleDiagramImage,
} from '@/lib/supabase/admin/generated-exercises-server';
import { generateAnatomicalMuscleImage } from '@/lib/gemini-server';
import { uploadBufferToStorage } from '@/lib/supabase/admin/storage-upload';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const id = params?.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Exercise ID is required' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    await verifyAdminRequest(request, cookies);
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const exercise = await getGeneratedExerciseById(id);
  if (!exercise) {
    return new Response(JSON.stringify({ error: 'Exercise not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }

  if (!exercise.muscleEngagementMap?.muscles?.length) {
    return new Response(
      JSON.stringify({ error: 'Exercise has no muscle map. Generate Deep Dive first.' }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const dataUrl = await generateAnatomicalMuscleImage(
      exercise.exerciseName,
      exercise.muscleEngagementMap
    );
    const buffer = dataUrlToBuffer(dataUrl);
    const storagePath = `generated-exercises/${id}/muscle-diagram.png`;
    const { downloadUrl } = await uploadBufferToStorage(
      buffer,
      storagePath,
      'image/png'
    );
    await updateGeneratedExerciseMuscleDiagramImage(id, downloadUrl);

    return new Response(JSON.stringify({ imageUrl: downloadUrl }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[generate-muscle-image]', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
