/**
 * Admin analytics: Hub monetization drop-off (Stripe funnel from analytics_funnel_events).
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getMonetizationDropOffStats } from '@/lib/supabase/admin/analytics-monetization-dropoff';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const days = Math.min(
      90,
      Math.max(1, parseInt(url.searchParams.get('days') ?? '30', 10) || 30)
    );
    const stats = await getMonetizationDropOffStats(days);

    return new Response(JSON.stringify(stats), {
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
      console.error('[admin/analytics/monetization-dropoff] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch monetization drop-off analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
