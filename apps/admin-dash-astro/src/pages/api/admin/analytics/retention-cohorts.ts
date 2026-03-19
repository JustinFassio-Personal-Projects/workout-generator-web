/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin analytics retention cohorts API: weekly cohorts from Firebase Auth + Firestore activity.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getRetentionCohortStats } from '@/lib/firebase/retention-cohorts';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const granularityParam = url.searchParams.get('granularity') ?? 'week';
    const granularity =
      granularityParam === 'day' ? 'day' : 'week';

    const activeDefinitionParam = url.searchParams.get('activeDefinition') ?? 'session';
    const activeDefinition =
      activeDefinitionParam === 'workout' ? 'workout' : 'session';

    let params: { granularity: 'week'; cohortWeeks: number; periods: number; activeDefinition?: 'session' | 'workout' } | {
      granularity: 'day';
      cohortDays: number;
      periods: number;
      activeDefinition?: 'session' | 'workout';
    };

    if (granularity === 'week') {
      const cohortWeeks = Math.min(
        24,
        Math.max(4, parseInt(url.searchParams.get('cohortWeeks') ?? '12', 10) || 12)
      );
      const periods = Math.min(
        24,
        Math.max(1, parseInt(url.searchParams.get('periods') ?? '13', 10) || 13)
      );
      params = { granularity: 'week', cohortWeeks, periods, activeDefinition };
    } else {
      const cohortDays = Math.min(
        90,
        Math.max(7, parseInt(url.searchParams.get('cohortDays') ?? '30', 10) || 30)
      );
      const periods = Math.min(
        60,
        Math.max(1, parseInt(url.searchParams.get('periods') ?? '31', 10) || 31)
      );
      params = { granularity: 'day', cohortDays, periods, activeDefinition };
    }

    const result = await getRetentionCohortStats(params);

    if (!result) {
      return new Response(
        JSON.stringify({
          enabled: false,
          cohorts: [],
          source: 'firebase',
          granularity: params.granularity,
          activeDefinition,
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
      console.error('[admin/analytics/retention-cohorts] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch retention cohort stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
