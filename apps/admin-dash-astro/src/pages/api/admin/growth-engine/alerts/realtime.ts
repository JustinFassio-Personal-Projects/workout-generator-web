import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getActiveRealtimeAlerts } from '@/lib/admin/growth-engine/store';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
    const alerts = await getActiveRealtimeAlerts(limit);

    return new Response(
      JSON.stringify({
        unresolvedCount: alerts.length,
        alerts: alerts.map((alert) => ({
          id: alert.id,
          createdAt: alert.created_at,
          alertType: alert.alert_type,
          severity: alert.severity,
          dedupeKey: alert.dedupe_key,
          payload: alert.payload,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
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
      console.error('[admin/growth-engine/alerts/realtime] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch realtime alerts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
