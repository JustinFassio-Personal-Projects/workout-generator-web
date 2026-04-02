/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin API: workout attempt timeline or recent workout:start rows for journey drill-down.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { isFirebaseConfigured } from '@/lib/firebase/admin';
import {
  getWorkoutJourneyByAttemptId,
  listRecentWorkoutStarts,
} from '@/lib/firebase/workout-journey';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    if (!isFirebaseConfigured()) {
      return new Response(
        JSON.stringify({ error: 'Firebase is not configured for this environment.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const attemptId = url.searchParams.get('workout_attempt_id')?.trim() ?? '';
    const listStartsParam = url.searchParams.get('list_starts');
    const listStarts =
      listStartsParam === '1' ||
      listStartsParam === 'true' ||
      listStartsParam === 'yes';

    if (attemptId) {
      const steps = await getWorkoutJourneyByAttemptId(attemptId);
      if (steps === null) {
        return new Response(JSON.stringify({ error: 'Firestore unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ workout_attempt_id: attemptId, steps }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (listStarts) {
      const days = Math.min(
        90,
        Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7)
      );
      const limit = Math.min(
        200,
        Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50)
      );
      const starts = await listRecentWorkoutStarts(days, limit);
      if (starts === null) {
        return new Response(JSON.stringify({ error: 'Firestore unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ starts, days, limit }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        error:
          'Missing query: pass workout_attempt_id for a timeline, or list_starts=true for recent starts.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ((error as { message?: string })?.message ?? '');
    if (message === 'UNAUTHENTICATED' || message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/analytics/workout-journey] Error:', message || '(unknown)');
    }
    return new Response(JSON.stringify({ error: 'Failed to load workout journey data.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
