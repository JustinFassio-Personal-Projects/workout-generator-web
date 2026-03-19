/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin analytics engagement API: DAU/WAU/MAU, stickiness, sessions, feature adoption, power-user distribution.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getEngagementStats } from '@/lib/supabase/admin/analytics-engagement';
import { isFirebaseConfigured } from '@/lib/firebase/admin';
import { getHubActiveUsersFromFirestore } from '@/lib/firebase/engagement-hub';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const days = Math.min(
      90,
      Math.max(1, parseInt(url.searchParams.get('days') ?? '30', 10) || 30)
    );
    const stats = await getEngagementStats(days);

    let payload: Record<string, unknown> = {
      ...stats,
      activeUsersSource: 'supabase' as const,
    };

    if (isFirebaseConfigured()) {
      const hub = await getHubActiveUsersFromFirestore(days);
      if (hub) {
        payload = {
          ...payload,
          featureAdoptionHub: hub.featureAdoptionHub,
        };
        if (!hub.warnings?.length) {
          payload = {
            ...stats,
            dauByDay: hub.dauByDay,
            dau: hub.dau,
            wau: hub.wau,
            mau: hub.mau,
            stickiness: hub.stickiness,
            activeUsersSource: 'hub_firestore' as const,
            featureAdoptionHub: hub.featureAdoptionHub,
            featureAdoptionMarketing: stats.featureAdoptionMarketing,
          };
        } else {
          payload = {
            ...payload,
            engagementHubWarnings: hub.warnings,
          };
        }
      }
    }

    return new Response(JSON.stringify(payload), {
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
      console.error('[admin/analytics/engagement] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch engagement analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
