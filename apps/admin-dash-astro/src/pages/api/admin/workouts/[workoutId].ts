/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import {
  fetchWorkoutDocument,
  updateWorkoutSet,
  updateWorkoutFeatured,
  deleteWorkoutSet,
} from '@/lib/supabase/admin/workout-sets';
import type { WorkoutSetTemplate, WorkoutConfig } from '@/types/ai-workout';

export const GET: APIRoute = async ({ request, params, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const workoutId = params.workoutId;
    if (!workoutId) {
      return new Response(JSON.stringify({ error: 'Workout ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const doc = await fetchWorkoutDocument(workoutId);
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/workouts] Error fetching workout:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch workout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request, params, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const workoutId = params.workoutId;
    if (!workoutId) {
      return new Response(JSON.stringify({ error: 'Workout ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body: {
      status?: 'draft' | 'published';
      featured_on_landing?: boolean;
      workoutSet?: WorkoutSetTemplate;
      workoutConfig?: WorkoutConfig;
    };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasFeatured = typeof body.featured_on_landing === 'boolean';
    const hasOther =
      body.status !== undefined ||
      body.workoutSet !== undefined ||
      body.workoutConfig !== undefined;
    if (!hasFeatured && !hasOther) {
      return new Response(
        JSON.stringify({
          error:
            'Provide at least one field: status, featured_on_landing, workoutSet, or workoutConfig',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Rely on DB constraint (workout_sets_featured_requires_published) for featured-on-landing;
    // avoid extra fetch and TOCTOU by catching CHECK violation and returning a clear error.
    if (hasOther) {
      await updateWorkoutSet(workoutId, {
        status: body.status,
        featured_on_landing: body.featured_on_landing,
        workoutSet: body.workoutSet,
        workoutConfig: body.workoutConfig,
      });
    } else if (hasFeatured) {
      try {
        await updateWorkoutFeatured(workoutId, body.featured_on_landing!);
      } catch (err: unknown) {
        const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
        if (code === '23514') {
          return new Response(
            JSON.stringify({ error: 'Publish the workout first to feature it on the homepage.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw err;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/workouts] Error updating workout:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to update workout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request, params, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const workoutId = params.workoutId;
    if (!workoutId) {
      return new Response(JSON.stringify({ error: 'Workout ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await deleteWorkoutSet(workoutId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (error.message.includes('not found')) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/workouts] Error deleting workout:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to delete workout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
