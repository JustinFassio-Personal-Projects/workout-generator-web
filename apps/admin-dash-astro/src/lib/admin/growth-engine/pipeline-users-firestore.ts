import { FieldPath, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

import type { GrowthState } from './types';
import { deriveGrowthStateFromHubUser } from './growth-state-derive';
import { getFirebaseFirestore } from '@/lib/firebase/admin';
import { parseSignupTimeMs } from '@/lib/admin/signupQuickStats';
import type { FirestoreHubUser } from '@/types/admin-users';

export type GrowthPipelineUserSource = 'firebase' | 'supabase';

export { deriveGrowthStateFromHubUser };

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
  created_at?: unknown;
};

export type FirestorePipelineUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  growthState: GrowthState | null;
  trialEndsAt: string | null;
  purchasedIndex: number | null;
  /** Hub `created_at` when parseable; used for admin merged list sorting. */
  createdAt: string | null;
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

function toFirestorePipelineUser(doc: QueryDocumentSnapshot): FirestorePipelineUser {
  const data = (doc.data() ?? {}) as FirestoreUserDoc;
  const email = normalizeText(data.email);
  const trialEndsAt =
    parseTrialEndIso(data.trial_ends_at) ??
    parseTrialEndIso(data.trial_end_at) ??
    parseTrialEndIso(data.trial_end);
  const createdAt = parseTrialEndIso(data.created_at);
  const growthState = deriveGrowthStateFromHubUser({
    subscriptionTier: normalizeText(data.subscription_tier),
    subscriptionStatus: normalizeText(data.subscription_status),
    trialEndsAt,
    createdAt: createdAt ?? undefined,
  });
  return {
    id: doc.id,
    email,
    displayName: displayNameFromHubUser(data, email),
    growthState,
    trialEndsAt,
    purchasedIndex: growthState === 'premium_subscriber' ? 0 : null,
    createdAt,
  };
}

/** Same ms logic as admin signup stats (single source of truth). */
export function signupMsFromPipelineRow(row: FirestorePipelineUser): number | null {
  return parseSignupTimeMs(row.createdAt);
}

export function pipelineRowToFirestoreHubUser(row: FirestorePipelineUser): FirestoreHubUser {
  return {
    firebaseUid: row.id,
    email: row.email,
    displayName: row.displayName,
    growthState: row.growthState,
    trialEndsAt: row.trialEndsAt,
    purchasedIndex: row.purchasedIndex,
    createdAt: row.createdAt,
  };
}

/** Newest signup first; missing `created_at` last; stable tie-break on id. */
export function sortHubUsersBySignupDesc(rows: FirestorePipelineUser[]): FirestorePipelineUser[] {
  return [...rows].sort((a, b) => {
    const ma = signupMsFromPipelineRow(a);
    const mb = signupMsFromPipelineRow(b);
    if (ma === null && mb === null) return a.id.localeCompare(b.id);
    if (ma === null) return 1;
    if (mb === null) return -1;
    if (mb !== ma) return mb - ma;
    return a.id.localeCompare(b.id);
  });
}

const HUB_SIGNUP_STATS_BATCH = 500;

/**
 * Full `users` collection walk; sorted by signup time for admin list + stats alignment.
 * One snapshot per call (full scan). See hub-dashboard API.
 */
export async function loadAllHubUsersForAdminSnapshot(): Promise<FirestorePipelineUser[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];

  const rows: FirestorePipelineUser[] = [];
  let lastDoc: QueryDocumentSnapshot | null = null;

  for (;;) {
    let q = db.collection('users').orderBy(FieldPath.documentId(), 'desc').limit(HUB_SIGNUP_STATS_BATCH);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snapshot = await q.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      rows.push(toFirestorePipelineUser(doc));
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    if (snapshot.docs.length < HUB_SIGNUP_STATS_BATCH) break;
  }

  return sortHubUsersBySignupDesc(rows);
}

/**
 * Maps Firestore `users/{docId}` to the marketing/billing fields mirrored into Supabase `profiles`
 * (see `sync-firestore-profiles.ts` and hub profile sync migration).
 */
export function hubUserSnapshotToProfileSyncPayload(doc: QueryDocumentSnapshot): {
  firebase_uid: string;
  email: string | null;
  full_name: string | null;
  trial_ends_at: string | null;
  purchased_index: number | null;
  created_at: string | null;
} {
  const row = toFirestorePipelineUser(doc);
  return {
    firebase_uid: doc.id,
    email: row.email,
    full_name: row.displayName,
    trial_ends_at: row.trialEndsAt,
    purchased_index: row.purchasedIndex,
    created_at: row.createdAt,
  };
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
  /** Admin Users UI only; raises per-request cap from 200 to 500. */
  forAdminList?: boolean;
}): Promise<{ users: FirestorePipelineUser[]; nextCursor: string | null }> {
  const db = getFirebaseFirestore();
  if (!db) return { users: [], nextCursor: null };

  const maxCap = params?.forAdminList ? 500 : 200;
  const limit = Math.min(maxCap, Math.max(1, params?.limit ?? 50));
  const growthStateFilter = params?.growthState ?? null;

  const users: FirestorePipelineUser[] = [];
  let firestoreCursor = params?.cursor ?? null;
  let nextCursor: string | null = null;

  while (users.length < limit) {
    let query = db.collection('users').orderBy(FieldPath.documentId(), 'desc').limit(limit + 1);
    if (firestoreCursor) {
      query = query.startAfter(firestoreCursor);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    if (docs.length === 0) {
      nextCursor = null;
      break;
    }

    const hasMore = docs.length > limit;
    const batchDocs = hasMore ? docs.slice(0, limit) : docs;

    for (const doc of batchDocs) {
      const row = toFirestorePipelineUser(doc);
      if (!growthStateFilter || row.growthState === growthStateFilter) {
        if (users.length < limit) users.push(row);
      }
    }

    const lastDocId = batchDocs[batchDocs.length - 1]?.id ?? null;
    if (!hasMore) {
      nextCursor = null;
      break;
    }
    firestoreCursor = lastDocId;
    if (users.length >= limit) {
      nextCursor = lastDocId;
      break;
    }
  }

  return { users, nextCursor };
}

/**
 * Walks all Hub users (via `loadAllHubUsersForAdminSnapshot`) and returns signup instants in ms.
 */
export async function listAllHubSignupTimesMsFromFirestore(): Promise<number[]> {
  const sorted = await loadAllHubUsersForAdminSnapshot();
  const timesMs: number[] = [];
  for (const row of sorted) {
    const ms = signupMsFromPipelineRow(row);
    if (ms !== null) timesMs.push(ms);
  }
  return timesMs;
}
