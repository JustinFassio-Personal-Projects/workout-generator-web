/**
 * GET: Returns the exercise's deep dive HTML with the muscle engagement diagram
 * injected into the document (after the Muscle Map heading). Use this for the
 * iframe so the diagram appears inside the deep dive page.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getGeneratedExerciseById } from '@/lib/supabase/admin/generated-exercises-server';
import { injectMuscleDiagramImage } from '@/lib/muscle-diagram-html';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const id = params?.id;
  if (!id) {
    return new Response('Exercise ID required', { status: 400 });
  }

  try {
    await verifyAdminRequest(request, cookies);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const exercise = await getGeneratedExerciseById(id);
  if (!exercise?.deepDiveHtmlContent?.trim()) {
    return new Response('No deep dive content', { status: 404 });
  }

  const html = injectMuscleDiagramImage(
    exercise.deepDiveHtmlContent,
    exercise.muscleDiagramImageUrl
  );

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=0',
    },
  });
};
