/**
 * Firebase Admin SDK for admin-dash-astro.
 * Used for Handoff / hub signup counts (Firebase Auth listUsers).
 * Optional: returns null when FIREBASE_SERVICE_ACCOUNT_KEY is not configured.
 */

import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

export interface FirebaseSignupStats {
  signUpsByDay: { date: string; count: number }[];
  totalCount: number;
  oauthCount: number;
  emailCount: number;
  emailVerifiedCount: number;
}

let _auth: admin.auth.Auth | null = null;
let _initAttempted = false;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Initialize Firebase Admin SDK (lazy). Uses FIREBASE_SERVICE_ACCOUNT_KEY.
 * Returns null when env is missing; callers handle gracefully.
 */
function initializeFirebaseAdmin(): admin.auth.Auth | null {
  if (_auth) return _auth;
  if (_initAttempted) return null;

  _initAttempted = true;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey || typeof serviceAccountKey !== 'string') {
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
    const projectId =
      process.env.FIREBASE_PROJECT_ID ??
      (serviceAccount as { projectId?: string; project_id?: string }).projectId ??
      (serviceAccount as { project_id?: string }).project_id;
    if (!projectId) {
      console.warn('[Firebase Admin] No project_id; FIREBASE_PROJECT_ID or service account project_id required');
      return null;
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    }
    _auth = admin.auth();
    return _auth;
  } catch (error) {
    if (import.meta.env?.DEV || process.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[Firebase Admin] Failed to initialize:', error);
    }
    return null;
  }
}

/**
 * Check if Firebase is configured (FIREBASE_SERVICE_ACCOUNT_KEY present).
 */
export function isFirebaseConfigured(): boolean {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  return !!(key && typeof key === 'string');
}

/**
 * Get Firebase Auth instance, or null when not configured.
 */
export function getFirebaseAuth(): admin.auth.Auth | null {
  return initializeFirebaseAdmin();
}

/**
 * Get Firestore instance, or null when not configured.
 * Requires Cloud Datastore User (or Firebase Admin) on the service account to read user_activity_logs.
 */
export function getFirebaseFirestore(): admin.firestore.Firestore | null {
  const auth = initializeFirebaseAdmin();
  if (!auth) return null;
  return admin.firestore();
}

/**
 * List users created within the last `days` days. Paginates and filters by metadata.creationTime.
 * Returns null when Firebase is not configured.
 */
export async function listUsersForDateRange(days: number): Promise<FirebaseSignupStats | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  const fromTime = fromDate.getTime();
  const toTime = toDate.getTime();

  const signUpsByDayMap = new Map<string, number>();
  let totalCount = 0;
  let oauthCount = 0;
  let emailCount = 0;
  let emailVerifiedCount = 0;

  let pageToken: string | undefined;
  const maxResults = 1000;

  do {
    const result = await auth.listUsers(maxResults, pageToken);
    for (const user of result.users) {
      const created = user.metadata?.creationTime;
      if (!created) continue;
      const ts = new Date(created).getTime();
      if (ts < fromTime || ts > toTime) continue;

      totalCount += 1;
      const key = dateKey(new Date(created));
      signUpsByDayMap.set(key, (signUpsByDayMap.get(key) ?? 0) + 1);

      if (user.emailVerified) emailVerifiedCount += 1;

      const providerId = user.providerData?.[0]?.providerId ?? '';
      const isOAuth = providerId && providerId !== 'password' && providerId !== 'email';
      if (isOAuth) oauthCount += 1;
      else emailCount += 1;
    }
    pageToken = result.pageToken;
  } while (pageToken);

  const signUpsByDay = Array.from(signUpsByDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    signUpsByDay,
    totalCount,
    oauthCount,
    emailCount,
    emailVerifiedCount,
  };
}
