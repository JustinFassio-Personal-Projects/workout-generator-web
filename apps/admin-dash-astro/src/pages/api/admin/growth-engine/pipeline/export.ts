import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getGrowthPipelineRows, logGrowthPipelineExport } from '@/lib/admin/growth-engine/store';
import type { GrowthState } from '@/lib/admin/growth-engine/types';

function parseGrowthState(input: string | null): GrowthState | null {
  if (
    input === 'trial_active' ||
    input === 'trial_expiring_24h' ||
    input === 'downgraded_free' ||
    input === 'subscriber_active' ||
    input === 'churned'
  ) {
    return input;
  }
  return null;
}

function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const { uid } = await verifyAdminRequest(request, cookies);
    const maxRows = Math.min(5000, Math.max(1, parseInt(url.searchParams.get('limit') ?? '500', 10) || 500));
    const growthState = parseGrowthState(url.searchParams.get('growth_state'));
    const sort = url.searchParams.get('sort') === 'score_asc' ? 'score_asc' : 'score_desc';

    const result = await getGrowthPipelineRows({
      limit: maxRows,
      sort,
      growthState,
    });

    const header = ['uid', 'display_label', 'growth_state', 'lead_score', 'score_version', 'recommended_trigger', 'insight'];
    const lines = [header.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          escapeCsv(row.uid),
          escapeCsv(row.displayLabel),
          escapeCsv(row.growthState ?? ''),
          String(row.leadScore),
          escapeCsv(row.scoreVersion),
          escapeCsv(row.recommendedTrigger),
          escapeCsv(row.insight),
        ].join(',')
      );
    }

    await logGrowthPipelineExport({
      actorId: uid,
      rowCount: result.rows.length,
      filters: { limit: maxRows, growth_state: growthState, sort },
    });

    return new Response(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="growth-pipeline-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
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
      console.error('[admin/growth-engine/pipeline/export] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to export growth pipeline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
