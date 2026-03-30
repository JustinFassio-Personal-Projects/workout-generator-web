const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type GrowthState =
  | 'reverse_trial_active'
  | 'reverse_trial_expiring'
  | 'reverse_trial_expired'
  | 'premium_subscriber'
  | 'churned';

export type ProfileGrowthStateInput = {
  purchased_index: number | null;
  trial_ends_at: string | null;
  growth_state: GrowthState | null;
  created_at: string | null;
};

/**
 * Supabase `profiles` growth_state reconciliation (reverse trial + premium + churn).
 * See admin-dash docs / REVERSE_TRIAL_ROADMAP for precedence.
 */
export function deriveGrowthStateFromProfileRow(
  row: ProfileGrowthStateInput,
  nowMs: number = Date.now()
): GrowthState {
  const purchased = row.purchased_index;
  if (typeof purchased === 'number' && purchased >= 0) {
    return 'premium_subscriber';
  }

  if (row.growth_state === 'churned') {
    return 'churned';
  }

  const trialEndMs = row.trial_ends_at ? Date.parse(row.trial_ends_at) : Number.NaN;
  const hasTrialEnd = Number.isFinite(trialEndMs);

  if (hasTrialEnd && trialEndMs <= nowMs) {
    return 'reverse_trial_expired';
  }

  const dayNumber = dayNumberSinceCreated(row.created_at, nowMs);

  if (hasTrialEnd && trialEndMs > nowMs) {
    if (trialEndMs - nowMs <= MS_PER_DAY) {
      return 'reverse_trial_expiring';
    }
    if (dayNumber !== null && dayNumber >= 7) {
      return 'reverse_trial_expiring';
    }
    if (dayNumber !== null && dayNumber >= 4 && dayNumber <= 6) {
      return 'reverse_trial_expiring';
    }
    if (dayNumber !== null && dayNumber <= 3) {
      return 'reverse_trial_active';
    }
    return 'reverse_trial_active';
  }

  if (dayNumber === null || dayNumber < 1) {
    return 'reverse_trial_expired';
  }
  if (dayNumber <= 3) {
    return 'reverse_trial_active';
  }
  if (dayNumber <= 6) {
    return 'reverse_trial_expiring';
  }
  return 'reverse_trial_expired';
}

/**
 * Calendar day index since signup (UTC day boundaries, same formula as growth_state derivation).
 * Day 1 is the calendar day of `createdAtIso`. Returns null if missing or unparseable.
 */
export function calendarTrialDayNumberSinceSignupUtc(
  createdAtIso: string | null | undefined,
  nowMs: number = Date.now()
): number | null {
  if (!createdAtIso) return null;
  const createdMs = Date.parse(createdAtIso);
  if (!Number.isFinite(createdMs)) return null;
  return Math.floor((nowMs - createdMs) / MS_PER_DAY) + 1;
}

function dayNumberSinceCreated(createdAt: string | null, nowMs: number): number | null {
  return calendarTrialDayNumberSinceSignupUtc(createdAt, nowMs);
}

export type HubGrowthStateInput = {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
  createdAt?: string | null;
};

/**
 * Firestore Hub user → same `GrowthState` vocabulary as {@link deriveGrowthStateFromProfileRow}.
 * Does not emit `churned` unless subscription status indicates cancel / past_due / unpaid.
 */
export function deriveGrowthStateFromHubUser(
  input: HubGrowthStateInput,
  nowMs: number = Date.now()
): GrowthState | null {
  const tier = (input.subscriptionTier ?? '').trim().toLowerCase();
  const status = (input.subscriptionStatus ?? '').trim().toLowerCase();
  const trialEndsAt = input.trialEndsAt ? Date.parse(input.trialEndsAt) : Number.NaN;
  const isTrialFuture = Number.isFinite(trialEndsAt) && trialEndsAt > nowMs;

  if (status === 'canceled' || status === 'cancelled') return 'churned';
  if (status === 'past_due' || status === 'unpaid') return 'churned';

  const isPaidTier = tier !== '' && tier !== 'free' && tier !== 'none' && tier !== 'null';
  if (isPaidTier && status === 'active') return 'premium_subscriber';

  if (isTrialFuture) {
    if (trialEndsAt - nowMs <= MS_PER_DAY) {
      return 'reverse_trial_expiring';
    }
    const dayNumber = dayNumberSinceCreated(input.createdAt ?? null, nowMs);
    if (dayNumber !== null && dayNumber >= 7) {
      return 'reverse_trial_expiring';
    }
    if (dayNumber !== null && dayNumber >= 4 && dayNumber <= 6) {
      return 'reverse_trial_expiring';
    }
    if (dayNumber !== null && dayNumber <= 3) {
      return 'reverse_trial_active';
    }
    return 'reverse_trial_active';
  }

  if (Number.isFinite(trialEndsAt) && trialEndsAt <= nowMs) {
    return 'reverse_trial_expired';
  }

  if (!isPaidTier || status === 'none' || status === 'inactive') {
    const dayNumber = dayNumberSinceCreated(input.createdAt ?? null, nowMs);
    if (dayNumber === null || dayNumber < 1) {
      return 'reverse_trial_expired';
    }
    if (dayNumber <= 3) return 'reverse_trial_active';
    if (dayNumber <= 6) return 'reverse_trial_expiring';
    return 'reverse_trial_expired';
  }

  return null;
}
