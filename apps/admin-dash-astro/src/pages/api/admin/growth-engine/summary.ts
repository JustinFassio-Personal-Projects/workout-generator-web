import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { isGrowthEngineNarrativeEnabled } from '@/lib/admin/growth-engine/narrative-context';
import { getActiveRealtimeAlerts, getLatestDailyBrief } from '@/lib/admin/growth-engine/store';
import type { GrowthEngineCard, GrowthEngineNarrative } from '@/lib/admin/growth-engine/types';

type SummaryResponse = {
  generatedAt: string | null;
  insightRunId: string | null;
  rulePackVersion: string | null;
  narrativeEnabled: boolean;
  narrative: GrowthEngineNarrative | null;
  cards: GrowthEngineCard[];
  realtime: {
    unresolvedCount: number;
    alerts: Array<{
      id: string;
      createdAt: string;
      alertType: string;
      severity: string;
      dedupeKey: string;
      payload: Record<string, unknown>;
    }>;
  };
};

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const includeAlerts = url.searchParams.get('includeAlerts') !== 'false';
    const alertsLimit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('alertsLimit') ?? '20', 10) || 20));

    const [brief, alerts] = await Promise.all([
      getLatestDailyBrief(),
      includeAlerts ? getActiveRealtimeAlerts(alertsLimit) : Promise.resolve([]),
    ]);

    const response: SummaryResponse = {
      generatedAt: brief?.generated_at ?? null,
      insightRunId: brief?.insight_run_id ?? null,
      rulePackVersion: brief?.rule_pack_version ?? null,
      narrativeEnabled: isGrowthEngineNarrativeEnabled(),
      narrative: brief?.summary?.narrative ?? null,
      cards: brief?.summary?.cards ?? [],
      realtime: {
        unresolvedCount: alerts.length,
        alerts: alerts.map((alert) => ({
          id: alert.id,
          createdAt: alert.created_at,
          alertType: alert.alert_type,
          severity: alert.severity,
          dedupeKey: alert.dedupe_key,
          payload: alert.payload,
        })),
      },
    };

    return new Response(JSON.stringify(response), {
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
      console.error('[admin/growth-engine/summary] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to build growth engine summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
