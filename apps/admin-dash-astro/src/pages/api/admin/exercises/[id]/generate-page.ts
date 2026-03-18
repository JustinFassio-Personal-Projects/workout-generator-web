/**
 * POST: Generate Deep Dive HTML for an exercise (admin only).
 * Calls Gemini via generateExerciseHtml and stores result in generated_exercises.deep_dive_html_content.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import {
  getGeneratedExerciseById,
  updateGeneratedExerciseDeepDive,
  updateGeneratedExerciseMuscleMap,
} from '@/lib/supabase/admin/generated-exercises-server';
import { generateExerciseHtml, generateMuscleEngagementMap } from '@/lib/gemini-server';

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

    const [htmlContent, muscleEngagementMap] = await Promise.all([
      generateExerciseHtml(
        exerciseData.exerciseName,
        exerciseData.imageUrl,
        exerciseData.biomechanics
      ),
      generateMuscleEngagementMap(exerciseData.exerciseName, exerciseData.biomechanics),
    ]);

    await updateGeneratedExerciseDeepDive(id, htmlContent);
    await updateGeneratedExerciseMuscleMap(id, muscleEngagementMap);

    return new Response(
      JSON.stringify({ success: true, html: htmlContent, muscleEngagementMap }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[generate-page] Error generating deep dive:', error);
    const isDev = import.meta.env.DEV;
    const isMissingColumn =
      typeof message === 'string' &&
      (message.includes('muscle_engagement_map') ||
        (message.includes('column') && message.includes('does not exist')));
    const body = isMissingColumn
      ? 'Database migration required: run migration 00068_muscle_engagement_map.sql (adds muscle_engagement_map column).'
      : isDev
        ? message
        : 'Internal Server Error';
    return new Response(JSON.stringify({ error: body }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
