/**
 * Map Firestore client errors to HTTP responses so admins see index/IAM hints instead of a generic 500.
 */

function firestoreFailureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(error);
}

/**
 * Returns true when the error is typically a missing composite index or IAM denial.
 */
export function isFirestoreIndexOrPermissionError(error: unknown): boolean {
  const msg = firestoreFailureMessage(error).toLowerCase();
  if (msg.includes('failed_precondition') || msg.includes('failed-precondition')) return true;
  if (msg.includes('permission_denied') || msg.includes('permission denied')) return true;
  if (msg.includes('the query requires') && msg.includes('index')) return true;
  if (msg.includes('composite index')) return true;
  if (msg.includes('index') && (msg.includes('create') || msg.includes('requires'))) return true;
  const code = (error as { code?: unknown })?.code;
  if (code === 9 || code === 'failed-precondition' || code === 'permission-denied') return true;
  return false;
}

export interface FirestoreQueryErrorBody {
  error: string;
  hint: string;
  details?: string;
}

export function buildFirestoreQueryErrorBody(error: unknown, dev: boolean): FirestoreQueryErrorBody {
  const msg = firestoreFailureMessage(error);
  return {
    error:
      'Firestore query failed. Typical causes: composite index not built on this Firebase project, wrong project in FIREBASE_SERVICE_ACCOUNT_KEY, or the service account lacks Cloud Datastore User.',
    hint:
      'Deploy indexes from apps/aiworkoutgenerator-hub/firestore.indexes.json to the project that owns user_activity_logs. List queries need action (Ascending) + timestamp (Descending). Attempt timelines need workout_attempt_id + timestamp (Ascending). Generation timelines need generation_id + timestamp (Ascending). Session timelines need session_id + timestamp (Ascending). See apps/admin-dash-astro/docs/FIRESTORE_INDEXES_RETENTION.md.',
    ...(dev ? { details: msg } : {}),
  };
}
