import { FieldPath, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { getFirebaseFirestore } from '@/lib/firebase/admin';

import { hubUserSnapshotToProfileSyncPayload } from './pipeline-users-firestore';

function envTruthy(name: string): boolean {
  const v = (process.env[name] ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isRpcNotFoundError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('upsert_profile_from_hub') || msg.includes('42883') || msg.includes('PGRST202');
}

export type HubProfileSyncResult = {
  ok: boolean;
  skippedReason?: string;
  scanned: number;
  inserted: number;
  updated: number;
  errors: number;
  lastError?: string;
};

/** When true, `runGrowthEngineBatchJob` mirrors Firestore `users` into Supabase `profiles` before reconcile. */
export function isHubProfileSyncOnBatchEnabled(): boolean {
  return envTruthy('HUB_PROFILE_SYNC_ON_BATCH');
}

/**
 * Paginates Firestore `users` (newest doc ids first) and upserts a marketing slice into `profiles` via RPC
 * `public.upsert_profile_from_hub` (see supabase migration `20260328100000_hub_profile_firebase_sync.sql`).
 */
export async function runHubProfileSyncFromFirestore(): Promise<HubProfileSyncResult> {
  const db = getFirebaseFirestore();
  if (!db) {
    return {
      ok: true,
      skippedReason: 'firebase_not_configured',
      scanned: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
    };
  }

  const maxDocs = Math.min(10_000, Math.max(50, parsePositiveInt(process.env.HUB_PROFILE_SYNC_MAX_DOCS, 2000)));
  const pageSize = Math.min(200, maxDocs);

  const supabase = getSupabaseServiceRole();
  let scanned = 0;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let lastError: string | undefined;
  let batchAfterId: string | null = null;

  while (scanned < maxDocs) {
    let query = db.collection('users').orderBy(FieldPath.documentId(), 'desc').limit(pageSize);
    if (batchAfterId) {
      query = query.startAfter(batchAfterId);
    }
    const snapshot = await query.get();
    const docs = snapshot.docs;
    if (docs.length === 0) break;

    for (const doc of docs) {
      if (scanned >= maxDocs) break;
      scanned += 1;

      const payload = hubSnapshotToRpcArgs(doc);
      const { data, error } = await supabase.rpc('upsert_profile_from_hub', payload);

      if (error) {
        errors += 1;
        lastError = error.message?.slice(0, 300) ?? String(error).slice(0, 300);
        if (isRpcNotFoundError(error)) {
          return {
            ok: false,
            skippedReason: 'rpc_upsert_profile_from_hub_missing',
            scanned,
            inserted,
            updated,
            errors,
            lastError,
          };
        }
        continue;
      }

      const row = data as { ok?: boolean; inserted?: boolean; error?: string } | null;
      if (!row || row.ok === false) {
        errors += 1;
        lastError = typeof row?.error === 'string' ? row.error : 'upsert_returned_not_ok';
        continue;
      }
      if (row.inserted === true) inserted += 1;
      else updated += 1;
    }

    batchAfterId = docs[docs.length - 1]?.id ?? null;
    if (docs.length < pageSize) break;
  }

  return {
    ok: errors === 0,
    scanned,
    inserted,
    updated,
    errors,
    ...(lastError && errors > 0 ? { lastError } : {}),
  };
}

function hubSnapshotToRpcArgs(doc: QueryDocumentSnapshot) {
  const p = hubUserSnapshotToProfileSyncPayload(doc);
  return {
    p_firebase_uid: p.firebase_uid,
    p_email: p.email ?? '',
    p_full_name: p.full_name ?? '',
    p_trial_ends_at: p.trial_ends_at,
    p_purchased_index: p.purchased_index,
    p_created_at: p.created_at,
  };
}
