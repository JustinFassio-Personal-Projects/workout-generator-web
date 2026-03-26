import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getGrowthPipelineRows, upsertLeadScoreSpecVersion } from '@/lib/admin/growth-engine/store';
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

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    await upsertLeadScoreSpecVersion();

    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
    const cursor = url.searchParams.get('cursor');
    const sortRaw = url.searchParams.get('sort');
    const sort = sortRaw === 'score_asc' ? 'score_asc' : 'score_desc';
    const growthState = parseGrowthState(url.searchParams.get('growth_state'));

    const result = await getGrowthPipelineRows({
      limit,
      cursor,
      sort,
      growthState,
    });

    return new Response(
      JSON.stringify({
        rows: result.rows,
        nextCursor: result.nextCursor,
        scoreVersion: result.scoreVersion,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
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
      console.error('[admin/growth-engine/pipeline] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch growth pipeline' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
