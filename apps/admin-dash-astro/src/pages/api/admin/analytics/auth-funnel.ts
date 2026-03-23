/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin analytics auth-funnel API: sign-ins/sign-ups by day, funnel, OAuth vs email, TTFKA.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getAuthFunnelStats } from '@/lib/supabase/admin/analytics-auth-funnel';
import { isFirebaseConfigured } from '@/lib/firebase/admin';
import { getTtfkaHub } from '@/lib/firebase/ttfka-hub';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const daysParam = url.searchParams.get('days');
    const days = Math.min(90, Math.max(1, parseInt(daysParam ?? '30', 10) || 30));
    const stats = await getAuthFunnelStats(days);
    let payload: Record<string, unknown> = { ...stats };

    if (isFirebaseConfigured()) {
      const ttfkaHub = await getTtfkaHub(days);
      if (ttfkaHub) {
        payload = {
          ...payload,
          ttfkaDistributionHub: ttfkaHub.ttfkaDistributionHub,
        };
        if (ttfkaHub.warnings?.length) {
          payload = {
            ...payload,
            ttfkaHubWarnings: ttfkaHub.warnings,
          };
        }
      }
    }

    let body: string;
    try {
      body = JSON.stringify(payload);
    } catch (serializeErr) {
      const msg =
        serializeErr instanceof Error ? serializeErr.message : String(serializeErr);
      console.error('[admin/analytics/auth-funnel] JSON.stringify failed:', msg);
      throw new Error(`Response serialization failed: ${msg}`);
    }

    return new Response(body, {
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
    // Always log on 500 so Vercel function logs show the cause (e.g. missing env vars)
    console.error('[admin/analytics/auth-funnel] 500:', message);
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/analytics/auth-funnel] Full error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch auth funnel stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
