/**
 * POST: Update Deep Dive HTML for an exercise (admin only).
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import {
  getGeneratedExerciseById,
  updateGeneratedExerciseDeepDive,
} from '@/lib/supabase/admin/generated-exercises-server';

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { deepDiveHtmlContent, muscleEngagementMap } = body as {
      deepDiveHtmlContent?: unknown;
      muscleEngagementMap?: unknown;
    };

    if (typeof deepDiveHtmlContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'deepDiveHtmlContent is required and must be a string' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const existing = await getGeneratedExerciseById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Exercise not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await updateGeneratedExerciseDeepDive(id, deepDiveHtmlContent);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[update-deep-dive] Error:', error);

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
