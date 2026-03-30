import type { APIRoute } from 'astro';

import { parseGrowthState } from '@/lib/admin/growth-engine/growth-state-constants';
import type { GrowthState } from '@/lib/admin/growth-engine/types';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

const DEFAULT_STATES: GrowthState[] = [
  'reverse_trial_expiring',
  'reverse_trial_expired',
  'churned',
];

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703' || code === 'PGRST204';
}

/**
 * Admin JSON export for CRM / CDP sync (Phase 5 Option A). Service role; no PII beyond what `profiles` already stores.
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const parsed = parseGrowthState(url.searchParams.get('growth_state'));
    const growthStates = parsed ? [parsed] : DEFAULT_STATES;
    const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));

    const supabase = getSupabaseServiceRole();
    const primary = await supabase
      .from('profiles')
      .select(
        'id, email, firebase_uid, growth_state, trial_ends_at, created_at, lifecycle_email_opt_out, purchased_index'
      )
      .in('growth_state', growthStates)
      .limit(limit);

    const resolved =
      primary.error && isMissingColumnError(primary.error)
        ? await supabase
            .from('profiles')
            .select('id, email, growth_state, trial_ends_at, created_at, purchased_index')
            .in('growth_state', growthStates)
            .limit(limit)
        : primary;

    if (resolved.error) throw resolved.error;
    const rows = resolved.data ?? [];

    return new Response(
      JSON.stringify({
        growth_states: growthStates,
        limit,
        row_count: rows.length,
        rows,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ((error as { message?: string })?.message ?? '');
    if (message === 'UNAUTHENTICATED' || message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/growth-engine/lifecycle/segments] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to load lifecycle segments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const ALL: APIRoute = async () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
