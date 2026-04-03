/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Resolve display labels from Firestore user_profiles (doc id = Firebase UID).
 */

import type admin from 'firebase-admin';

/** Firestore getAll supports a limited number of document refs per call. */
const GET_ALL_BATCH_SIZE = 10;

function nameFromProfileData(
  data: admin.firestore.DocumentData | undefined
): string | null {
  if (!data) return null;
  const displayName = data.display_name;
  if (typeof displayName === 'string' && displayName.trim()) {
    return displayName.trim();
  }
  const first = data.first_name;
  const last = data.last_name;
  if (typeof first === 'string' || typeof last === 'string') {
    const name = [first, last].filter(Boolean).join(' ').trim();
    return name || null;
  }
  return null;
}

/**
 * Fetch display names from Firestore user_profiles for given UIDs.
 * Non-fatal on errors (returns partial or empty map).
 */
export async function fetchDisplayNamesByUid(
  db: admin.firestore.Firestore,
  uids: string[]
): Promise<Map<string, string>> {
  const byUid = new Map<string, string>();
  const unique = [...new Set(uids.map((u) => u.trim()).filter(Boolean))];
  if (unique.length === 0) return byUid;

  const collectionName =
    process.env.FIREBASE_USER_PROFILES_COLLECTION ?? 'user_profiles';

  try {
    for (let i = 0; i < unique.length; i += GET_ALL_BATCH_SIZE) {
      const batch = unique.slice(i, i + GET_ALL_BATCH_SIZE);
      const refs = batch.map((uid) => db.collection(collectionName).doc(uid));
      const snapshots = await db.getAll(...refs);
      for (let j = 0; j < batch.length; j++) {
        const doc = snapshots[j];
        if (!doc?.exists) continue;
        const name = nameFromProfileData(doc.data());
        if (name) byUid.set(batch[j], name);
      }
    }
  } catch {
    // Non-fatal: names are optional
  }
  return byUid;
}
