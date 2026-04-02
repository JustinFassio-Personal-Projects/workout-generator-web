/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin API: activity journey list (allowlist from activity-drill-down-config) +
 * generation_id and session_id timelines. Attempt-scoped journeys remain on workout-journey.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { isFirebaseConfigured } from '@/lib/firebase/admin';
import { getActivityJourneyListActions } from '@/lib/admin/activity-drill-down-config';
import {
  buildFirestoreQueryErrorBody,
  isFirestoreIndexOrPermissionError,
} from '@/lib/firebase/firestore-query-errors';
import {
  listRecentByAction,
  timelineByGenerationId,
  timelineBySessionId,
} from '@/lib/firebase/workout-journey';

/** List `action=` values allowed for list mode — kept in sync with enabled `activity_journey_list` registry rows. */
const ALLOWED_LIST_ACTIONS = new Set<string>(getActivityJourneyListActions());

function parseTruthy(param: string | null): boolean {
  if (param == null) return false;
  const v = param.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    if (!isFirebaseConfigured()) {
      return new Response(
        JSON.stringify({ error: 'Firebase is not configured for this environment.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const listMode = parseTruthy(url.searchParams.get('list'));
    const correlation = url.searchParams.get('correlation')?.trim() ?? '';
    const correlationId = url.searchParams.get('id')?.trim() ?? '';

    if (listMode && correlation) {
      return new Response(
        JSON.stringify({
          error: 'Invalid query: use either list mode or correlation timeline, not both.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (listMode) {
      const action = url.searchParams.get('action')?.trim() ?? '';
      if (!action) {
        return new Response(
          JSON.stringify({ error: 'Missing query: list mode requires action= (e.g. workout:generate).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!ALLOWED_LIST_ACTIONS.has(action)) {
        return new Response(
          JSON.stringify({
            error: `Unsupported action for list mode. Allowed: ${[...ALLOWED_LIST_ACTIONS].join(', ')}.`,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const days = Math.min(
        90,
        Math.max(1, parseInt(url.searchParams.get('days') ?? '7', 10) || 7)
      );
      const limit = Math.min(
        200,
        Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50)
      );

      const rows = await listRecentByAction(action, days, limit);
      if (rows === null) {
        return new Response(JSON.stringify({ error: 'Firestore unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ mode: 'list' as const, action, days, limit, rows }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (correlation) {
      if (correlation !== 'generation_id' && correlation !== 'session_id') {
        return new Response(
          JSON.stringify({
            error:
              'Unsupported correlation. Use correlation=generation_id or correlation=session_id with id=.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!correlationId) {
        return new Response(
          JSON.stringify({ error: `Missing query: correlation=${correlation} requires id=.` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let rows;
      try {
        rows =
          correlation === 'session_id'
            ? await timelineBySessionId(correlationId)
            : await timelineByGenerationId(correlationId);
      } catch (firestoreErr) {
        if (isFirestoreIndexOrPermissionError(firestoreErr)) {
          const dev = import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true';
          if (dev) console.error('[admin/analytics/activity-journey] Firestore (timeline):', firestoreErr);
          return new Response(
            JSON.stringify(buildFirestoreQueryErrorBody(firestoreErr, dev)),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw firestoreErr;
      }
      if (rows === null) {
        return new Response(JSON.stringify({ error: 'Firestore unavailable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          mode: 'timeline' as const,
          correlation: correlation as 'generation_id' | 'session_id',
          id: correlationId,
          rows,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error:
          'Missing query: pass list=1&action=<hub_action>&days=&limit= for a list, or correlation=generation_id|session_id&id= for a timeline.',
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
    const dev = import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true';
    if (dev) {
      console.error('[admin/analytics/activity-journey] Error:', message || '(unknown)', error);
    }
    return new Response(
      JSON.stringify({
        error: 'Failed to load activity journey data.',
        ...(dev && message
          ? {
              details: message,
              hint: 'If this mentions an index, deploy apps/aiworkoutgenerator-hub/firestore.indexes.json. See FIRESTORE_INDEXES_RETENTION.md.',
            }
          : {}),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
