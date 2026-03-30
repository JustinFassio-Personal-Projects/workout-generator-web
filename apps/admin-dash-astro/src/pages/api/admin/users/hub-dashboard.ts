/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single Hub snapshot per request: quick stats + users slice sorted by signup (full collection scan).
 */

import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getFirebaseFirestore } from '@/lib/firebase/admin';
import {
  computeSignupQuickStatsFromMs,
  type SignupQuickStats,
} from '@/lib/admin/signupQuickStats';
import {
  loadAllHubUsersForAdminSnapshot,
  pipelineRowToFirestoreHubUser,
  signupMsFromPipelineRow,
} from '@/lib/admin/growth-engine/pipeline-users-firestore';

export const prerender = false;

function parseLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 100;
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, n));
}

function parseOffset(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function serverAdminStatsTimeZone(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_ADMIN_STATS_TIMEZONE) {
    const z = String(import.meta.env.PUBLIC_ADMIN_STATS_TIMEZONE).trim();
    if (z) return z;
  }
  return 'America/Los_Angeles';
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    if (!getFirebaseFirestore()) {
      return new Response(
        JSON.stringify({
          configured: false,
          generatedAt: null,
          quickStats: null as SignupQuickStats | null,
          users: [],
          totalUsers: 0,
          nextOffset: null,
          excludedFromStatsCount: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const limit = parseLimit(url.searchParams.get('limit'));
    const offset = parseOffset(url.searchParams.get('offset'));

    const rows = await loadAllHubUsersForAdminSnapshot();
    const totalUsers = rows.length;
    const excludedFromStatsCount = rows.filter((r) => signupMsFromPipelineRow(r) === null).length;

    const timesMs: number[] = [];
    for (const row of rows) {
      const ms = signupMsFromPipelineRow(row);
      if (ms !== null) timesMs.push(ms);
    }

    const now = new Date();
    const timeZone = serverAdminStatsTimeZone();
    const quickStats = computeSignupQuickStatsFromMs(timesMs, now, { timeZone });

    const slice = rows.slice(offset, offset + limit);
    const users = slice.map(pipelineRowToFirestoreHubUser);
    const nextEnd = offset + slice.length;
    const nextOffset = nextEnd < totalUsers ? nextEnd : null;

    const body = {
      configured: true,
      generatedAt: now.toISOString(),
      quickStats,
      users,
      totalUsers,
      nextOffset,
      excludedFromStatsCount,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/users/hub-dashboard] Error:', error);
    }

    return new Response(JSON.stringify({ error: 'Failed to load Hub dashboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
