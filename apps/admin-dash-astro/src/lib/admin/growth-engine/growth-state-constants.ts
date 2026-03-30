import type { GrowthState } from './types';

/** Allowed `profiles.growth_state` values (excluding null). */
export const GROWTH_STATE_VALUES = [
  'reverse_trial_active',
  'reverse_trial_expiring',
  'reverse_trial_expired',
  'premium_subscriber',
  'churned',
] as const satisfies readonly GrowthState[];

const ALLOWED = new Set<string>(GROWTH_STATE_VALUES);

export function parseGrowthState(input: string | null): GrowthState | null {
  if (!input || !ALLOWED.has(input)) return null;
  return input as GrowthState;
}
