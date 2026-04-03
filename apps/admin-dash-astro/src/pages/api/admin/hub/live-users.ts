/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Distinct hub users from hub activity logs or presence (admin home Live card).
 * Default activity window: since midnight America/Los_Angeles through now (`window=pacific_day`).
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getFirebaseFirestore } from '@/lib/firebase/admin';
import {
  buildFirestoreQueryErrorBody,
  isFirestoreIndexOrPermissionError,
} from '@/lib/firebase/firestore-query-errors';
import { getStartOfPacificCalendarDayUtc } from '@/lib/firebase/live-hub-pacific-day';
import {
  LIVE_HUB_DEFAULT_SCAN_LIMIT,
  LIVE_HUB_DEFAULT_SCAN_LIMIT_PACIFIC_DAY,
  LIVE_HUB_DEFAULT_USER_LIMIT,
  LIVE_HUB_DEFAULT_WINDOW_MINUTES,
  LIVE_HUB_MAX_USER_LIMIT,
  LIVE_HUB_MAX_WINDOW_MINUTES,
  type LiveHubActivityWindowKind,
  fetchLiveHubUsersAggregates,
} from '@/lib/firebase/live-hub-users';
import { fetchLiveHubPresenceUsers } from '@/lib/firebase/live-hub-presence';
import { fetchDisplayNamesByUid } from '@/lib/firebase/user-profile-display-names';

export const prerender = false;

const JSON_NO_STORE = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

function parseMinutes(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : LIVE_HUB_DEFAULT_WINDOW_MINUTES;
  if (!Number.isFinite(n)) return LIVE_HUB_DEFAULT_WINDOW_MINUTES;
  return Math.min(LIVE_HUB_MAX_WINDOW_MINUTES, Math.max(1, n));
}

function parseUserLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : LIVE_HUB_DEFAULT_USER_LIMIT;
  if (!Number.isFinite(n)) return LIVE_HUB_DEFAULT_USER_LIMIT;
  return Math.min(LIVE_HUB_MAX_USER_LIMIT, Math.max(1, n));
}

function parseScanLimit(raw: string | null, defaultLimit: number): number {
  const n = raw ? Number.parseInt(raw, 10) : defaultLimit;
  if (!Number.isFinite(n)) return defaultLimit;
  return Math.min(2000, Math.max(50, n));
}

/** Activity logs only. Default is Pacific calendar day (midnight PT through now). */
function parseActivityWindow(raw: string | null): LiveHubActivityWindowKind {
  if (raw === 'rolling') return 'rolling';
  return 'pacific_day';
}

function parseSource(raw: string | null): 'activity' | 'presence' {
  if (raw === 'presence') return 'presence';
  return 'activity';
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const source = parseSource(url.searchParams.get('source'));
    const activityWindow =
      source === 'activity' ? parseActivityWindow(url.searchParams.get('window')) : 'rolling';
    const windowMinutesRolling = parseMinutes(url.searchParams.get('minutes'));
    const userLimit = parseUserLimit(url.searchParams.get('limit'));
    const scanDefault =
      source === 'activity' && activityWindow === 'pacific_day'
        ? LIVE_HUB_DEFAULT_SCAN_LIMIT_PACIFIC_DAY
        : LIVE_HUB_DEFAULT_SCAN_LIMIT;
    const scanLimit = parseScanLimit(url.searchParams.get('scan'), scanDefault);
    const now = new Date();
    const windowStartIso =
      source === 'activity' && activityWindow === 'pacific_day'
        ? getStartOfPacificCalendarDayUtc(now).toISOString()
        : null;

    const db = getFirebaseFirestore();
    if (!db) {
      return new Response(
        JSON.stringify({
          configured: false,
          source,
          windowMode: activityWindow,
          windowMinutes:
            source === 'presence' || activityWindow === 'rolling' ? windowMinutesRolling : null,
          windowTimezone: activityWindow === 'pacific_day' ? 'America/Los_Angeles' : undefined,
          windowStart: windowStartIso,
          generatedAt: now.toISOString(),
          distinctUserCount: 0,
          users: [],
          scanLimit,
        }),
        { status: 200, headers: JSON_NO_STORE }
      );
    }

    let aggregated;
    try {
      aggregated =
        source === 'presence'
          ? await fetchLiveHubPresenceUsers({
              windowMinutes: windowMinutesRolling,
              userLimit,
              scanLimit,
            })
          : await fetchLiveHubUsersAggregates({
              activityWindow,
              windowMinutes: windowMinutesRolling,
              userLimit,
              scanLimit,
              now,
            });
    } catch (firestoreErr) {
      if (isFirestoreIndexOrPermissionError(firestoreErr)) {
        const dev = import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true';
        if (dev) console.error('[admin/hub/live-users] Firestore:', firestoreErr);
        return new Response(JSON.stringify(buildFirestoreQueryErrorBody(firestoreErr, dev)), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw firestoreErr;
    }

    if (!aggregated) {
      return new Response(JSON.stringify({ error: 'Firestore unavailable.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const uids = aggregated.users.map((u) => u.user_id);
    const displayNames = await fetchDisplayNamesByUid(db, uids);
    const users = aggregated.users.map((u) => ({
      ...u,
      display_name: displayNames.get(u.user_id) ?? null,
    }));

    const note =
      source === 'presence'
        ? 'Based on hub heartbeat (user_presence), not activity logs. distinctUserCount is users returned in this query (up to scan limit).'
        : activityWindow === 'pacific_day'
          ? 'Activity from midnight Pacific (America/Los_Angeles) through now. distinctUserCount counts unique user_ids in the sampled logs (up to scan limit); high volume may undercount.'
          : 'distinctUserCount counts unique user_ids in the sampled logs (up to scan limit); high volume may undercount.';

    return new Response(
      JSON.stringify({
        configured: true,
        source,
        windowMode: activityWindow,
        windowMinutes:
          source === 'presence' || activityWindow === 'rolling' ? windowMinutesRolling : null,
        windowTimezone: activityWindow === 'pacific_day' ? 'America/Los_Angeles' : undefined,
        windowStart: windowStartIso,
        generatedAt: now.toISOString(),
        distinctUserCount: aggregated.distinctUserCount,
        users,
        scanLimit,
        note,
      }),
      { status: 200, headers: JSON_NO_STORE }
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
    if (dev) console.error('[admin/hub/live-users] Error:', message || '(unknown)', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to load live hub users.',
        ...(dev && message ? { details: message } : {}),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
