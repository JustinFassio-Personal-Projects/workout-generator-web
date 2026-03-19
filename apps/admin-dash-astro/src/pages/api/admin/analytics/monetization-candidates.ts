/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin analytics monetization candidates: high-intent Firebase UIDs for outreach lookup.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getMonetizationCandidates } from '@/lib/firebase/monetization-candidates';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const segmentParam = url.searchParams.get('segment') ?? 'new';
    const segment = segmentParam === 'return' ? 'return' : 'new';

    const windowDays = Math.min(
      90,
      Math.max(7, parseInt(url.searchParams.get('windowDays') ?? '14', 10) || 14)
    );
    const recentDays = Math.min(
      30,
      Math.max(1, parseInt(url.searchParams.get('recentDays') ?? '7', 10) || 7)
    );
    const limit = Math.min(
      100,
      Math.max(10, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50)
    );
    const minWorkoutEvents = Math.max(
      0,
      parseInt(url.searchParams.get('minWorkoutEvents') ?? '1', 10) || 1
    );
    const totalActiveLookbackDays = Math.min(
      730,
      Math.max(7, parseInt(url.searchParams.get('totalActiveLookbackDays') ?? '365', 10) || 365)
    );
    const activeDefinitionParam = url.searchParams.get('activeDefinition') ?? 'workout';
    const activeDefinition = activeDefinitionParam === 'session' ? 'session' : 'workout';

    const result = await getMonetizationCandidates({
      segment,
      windowDays,
      recentDays,
      totalActiveLookbackDays,
      limit,
      minWorkoutEvents,
      activeDefinition,
    });

    if (!result) {
      return new Response(
        JSON.stringify({
          enabled: false,
          segment,
          generatedAt: new Date().toISOString(),
          candidates: [],
          source: 'firebase',
          totalActiveLookbackDays,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
      console.error('[admin/analytics/monetization-candidates] Error:', error);
    }
    return new Response(
      JSON.stringify({ error: 'Failed to fetch monetization candidates' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
