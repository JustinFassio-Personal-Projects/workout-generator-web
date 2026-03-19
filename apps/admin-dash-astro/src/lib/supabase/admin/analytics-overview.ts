/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics overview: total events and distinct users in a date range from analytics_funnel_events.
 */

import { getSupabaseServer } from '../server';

export interface AnalyticsOverviewResult {
  from: string;
  to: string;
  totalEvents: number;
  distinctUsers: number;
}

export async function getAnalyticsOverview(days: number): Promise<AnalyticsOverviewResult> {
  const supabase = getSupabaseServer();
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const { count: totalEvents, error: countError } = await supabase
    .from('analytics_funnel_events')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', fromIso)
    .lte('timestamp', toIso);

  if (countError) throw countError;

  // Count distinct visitors (same logic as Acquisition): coalesce(user_id, session_id).
  // Overview previously only counted user_id, so anonymous sessions showed 0. Align with Acquisition.
  const { data: visitorRows, error: visitorError } = await supabase
    .from('analytics_funnel_events')
    .select('user_id, session_id')
    .gte('timestamp', fromIso)
    .lte('timestamp', toIso)
    .limit(50000);

  if (visitorError) throw visitorError;

  const distinctVisitorKeys = new Set(
    (visitorRows ?? []).map((r) => {
      const row = r as { user_id?: string | null; session_id?: string | null };
      return row.user_id ?? row.session_id ?? '';
    }).filter((k) => k.length > 0)
  );

  return {
    from: fromIso,
    to: toIso,
    totalEvents: totalEvents ?? 0,
    distinctUsers: distinctVisitorKeys.size,
  };
}
