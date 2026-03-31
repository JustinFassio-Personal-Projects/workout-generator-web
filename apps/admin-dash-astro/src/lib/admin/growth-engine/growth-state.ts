import type { PostgrestSingleResponse } from '@supabase/postgrest-js';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import type { GrowthState } from './types';
import { deriveGrowthStateFromProfileRow } from './growth-state-derive';

type ProfileStateRow = {
  id: string;
  purchased_index: number | null;
  trial_ends_at: string | null;
  growth_state: GrowthState | null;
  created_at: string | null;
};

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703';
}

export async function reconcileGrowthStates(limit = 2000): Promise<{ updated: number; scanned: number }> {
  const supabase = getSupabaseServiceRole();
  let canWriteGrowthState = true;
  let result: PostgrestSingleResponse<ProfileStateRow[]> = await supabase
    .from('profiles')
    .select('id, purchased_index, trial_ends_at, growth_state, created_at')
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
    const synthesized: ProfileStateRow[] = (
      (fallback.data ?? []) as Array<{ id: string; purchased_index: number | null }>
    ).map((row) => ({
      id: row.id,
      purchased_index: row.purchased_index,
      growth_state: null,
      trial_ends_at: null,
      created_at: null,
    }));
    result = {
      data: synthesized,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
  }

  if (result.error) throw result.error;
  const rows = (result.data as ProfileStateRow[]) ?? [];

  const updates = rows
    .map((row) => {
      const next = deriveGrowthStateFromProfileRow(row);
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
