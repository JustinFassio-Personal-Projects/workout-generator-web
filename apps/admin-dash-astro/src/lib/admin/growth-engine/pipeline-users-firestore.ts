import { FieldPath } from 'firebase-admin/firestore';

import type { GrowthState } from './types';
import { getFirebaseFirestore } from '@/lib/firebase/admin';

export type GrowthPipelineUserSource = 'firebase' | 'supabase';

type FirestoreUserDoc = {
  id?: string;
  email?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  trial_end?: unknown;
  trial_end_at?: unknown;
  trial_ends_at?: unknown;
};

export type FirestorePipelineUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  growthState: GrowthState | null;
  trialEndsAt: string | null;
  purchasedIndex: number | null;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? t : null;
}

function parseTrialEndIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  return null;
}

export function deriveGrowthStateFromHubUser(input: {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | null;
}): GrowthState | null {
  const tier = (input.subscriptionTier ?? '').trim().toLowerCase();
  const status = (input.subscriptionStatus ?? '').trim().toLowerCase();
  const trialEndsAt = input.trialEndsAt ? Date.parse(input.trialEndsAt) : Number.NaN;
  const isTrialFuture = Number.isFinite(trialEndsAt) && trialEndsAt > Date.now();

  if (isTrialFuture) {
    return trialEndsAt - Date.now() <= 24 * 60 * 60 * 1000 ? 'trial_expiring_24h' : 'trial_active';
  }

  const isPaidTier = tier !== '' && tier !== 'free' && tier !== 'none' && tier !== 'null';
  if (isPaidTier && status === 'active') return 'subscriber_active';

  if (status === 'canceled' || status === 'cancelled') return 'churned';
  if (status === 'past_due' || status === 'unpaid') return 'churned';

  if (!isPaidTier || status === 'none' || status === 'inactive') return 'downgraded_free';
  return null;
}

function displayNameFromHubUser(data: FirestoreUserDoc, email: string | null): string | null {
  const direct =
    normalizeText(data.display_name) ?? normalizeText(data.full_name) ?? normalizeText(data.id);
  if (direct) return direct;
  const first = normalizeText(data.first_name);
  const last = normalizeText(data.last_name);
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (!email) return null;
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}

export function getGrowthPipelineUserSource(): GrowthPipelineUserSource {
  const raw = (process.env.GROWTH_PIPELINE_USER_SOURCE ?? '').trim().toLowerCase();
  if (raw === 'supabase') return 'supabase';
  if (raw === 'firebase') return 'firebase';
  return getFirebaseFirestore() ? 'firebase' : 'supabase';
}

export async function listPipelineUsersFromFirestore(params?: {
  limit?: number;
  cursor?: string | null;
  growthState?: GrowthState | null;
}): Promise<{ users: FirestorePipelineUser[]; nextCursor: string | null }> {
  const db = getFirebaseFirestore();
  if (!db) return { users: [], nextCursor: null };

  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  let query = db.collection('users').orderBy(FieldPath.documentId(), 'desc').limit(limit + 1);
  if (params?.cursor) {
    const snap = await db.collection('users').doc(params.cursor).get();
    if (snap.exists) query = query.startAfter(snap);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const hasMore = docs.length > limit;
  const selected = hasMore ? docs.slice(0, limit) : docs;

  const users = selected
    .map((doc) => {
      const data = (doc.data() ?? {}) as FirestoreUserDoc;
      const email = normalizeText(data.email);
      const trialEndsAt =
        parseTrialEndIso(data.trial_ends_at) ??
        parseTrialEndIso(data.trial_end_at) ??
        parseTrialEndIso(data.trial_end);
      const growthState = deriveGrowthStateFromHubUser({
        subscriptionTier: normalizeText(data.subscription_tier),
        subscriptionStatus: normalizeText(data.subscription_status),
        trialEndsAt,
      });
      const row: FirestorePipelineUser = {
        id: doc.id,
        email,
        displayName: displayNameFromHubUser(data, email),
        growthState,
        trialEndsAt,
        purchasedIndex: growthState === 'subscriber_active' ? 0 : null,
      };
      return row;
    })
    .filter((row) => (params?.growthState ? row.growthState === params.growthState : true));

  const nextCursor = hasMore ? selected[selected.length - 1]?.id ?? null : null;
  return { users, nextCursor };
}
