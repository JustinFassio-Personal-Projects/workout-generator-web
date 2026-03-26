import { getSupabaseServiceRole } from '@/lib/supabase/server';
import type { GrowthState } from './types';

type ProfileStateRow = {
  id: string;
  purchased_index: number | null;
  trial_ends_at: string | null;
  growth_state: GrowthState | null;
};

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703';
}

function deriveGrowthState(row: Pick<ProfileStateRow, 'purchased_index' | 'trial_ends_at'>): GrowthState {
  const purchasedIndex = row.purchased_index;
  if (typeof purchasedIndex === 'number' && purchasedIndex >= 0) return 'subscriber_active';
  if (!row.trial_ends_at) return 'downgraded_free';

  const now = Date.now();
  const trialEndsAt = new Date(row.trial_ends_at).getTime();
  if (Number.isNaN(trialEndsAt)) return 'downgraded_free';

  if (trialEndsAt <= now) return 'downgraded_free';
  if (trialEndsAt - now <= 24 * 60 * 60 * 1000) return 'trial_expiring_24h';
  return 'trial_active';
}

export async function reconcileGrowthStates(limit = 2000): Promise<{ updated: number; scanned: number }> {
  const supabase = getSupabaseServiceRole();
  let canWriteGrowthState = true;
  let result = await supabase
    .from('profiles')
    .select('id, purchased_index, trial_ends_at, growth_state')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (result.error && isMissingColumnError(result.error)) {
    const fallback = await supabase
      .from('profiles')
      .select('id, purchased_index')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (fallback.error) throw fallback.error;
    canWriteGrowthState = false;
    result = {
      data: ((fallback.data ?? []) as Array<{ id: string; purchased_index: number | null }>).map((row) => ({
        id: row.id,
        purchased_index: row.purchased_index,
        growth_state: null,
        trial_ends_at: null,
      })),
      error: null,
    } as typeof result;
  }

  if (result.error) throw result.error;
  const rows = (result.data as ProfileStateRow[]) ?? [];

  const updates = rows
    .map((row) => {
      const next = deriveGrowthState(row);
      if (row.growth_state === next) return null;
      return { id: row.id, growth_state: next, growth_state_updated_at: new Date().toISOString() };
    })
    .filter((value): value is { id: string; growth_state: GrowthState; growth_state_updated_at: string } => Boolean(value));

  if (!updates.length || !canWriteGrowthState) {
    return { updated: 0, scanned: rows.length };
  }

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(updates, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  return { updated: updates.length, scanned: rows.length };
}
