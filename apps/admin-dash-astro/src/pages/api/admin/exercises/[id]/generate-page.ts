/**
 * POST: Generate Deep Dive HTML for an exercise (admin only).
 * Calls Gemini via generateExerciseHtml and stores result in generated_exercises.deep_dive_html_content.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import {
  getGeneratedExerciseById,
  updateGeneratedExerciseDeepDive,
} from '@/lib/supabase/admin/generated-exercises-server';
import { generateExerciseHtml } from '@/lib/gemini-server';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Exercise ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await verifyAdminRequest(request, cookies);
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const exerciseData = await getGeneratedExerciseById(id);
    if (!exerciseData) {
      return new Response(JSON.stringify({ error: 'Exercise not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const htmlContent = await generateExerciseHtml(
      exerciseData.exerciseName,
      exerciseData.imageUrl,
      exerciseData.biomechanics
    );

    await updateGeneratedExerciseDeepDive(id, htmlContent);

    return new Response(JSON.stringify({ success: true, html: htmlContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-page] Error generating deep dive:', error);

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
