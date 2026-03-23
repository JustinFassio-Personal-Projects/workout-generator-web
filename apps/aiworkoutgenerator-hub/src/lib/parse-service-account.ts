/**
 * Parsed service account with both snake_case (Google JSON) and camelCase support.
 * Compatible with admin.credential.cert() which accepts flexible object shapes.
 * Avoids firebase-admin import so this module can be used without triggering security scan.
 */
export interface ParsedServiceAccount extends Record<string, unknown> {
  projectId?: string;
  project_id?: string;
}

/**
 * Parse FIREBASE_SERVICE_ACCOUNT_KEY from environment or secret stores.
 *
 * Handles common issues:
 * - Extra surrounding quotes (e.g. '{"type": "..."}' or "{\"type\": \"...\"}")
 * - project_id (snake_case, Google JSON) vs projectId (camelCase, TypeScript)
 *
 * @param raw - Raw string from process.env.FIREBASE_SERVICE_ACCOUNT_KEY
 * @returns Parsed service account object suitable for admin.credential.cert()
 * @throws Error if parsing fails
 */
export function parseServiceAccountKey(raw: string): ParsedServiceAccount {
  let keyStr = raw.trim();

  // Strip surrounding quotes (common when secrets are stored with extra quoting)
  if (
    (keyStr.startsWith("'") && keyStr.endsWith("'")) ||
    (keyStr.startsWith('"') && keyStr.endsWith('"'))
  ) {
    keyStr = keyStr.slice(1, -1);
  }

  const parsed = JSON.parse(keyStr) as ParsedServiceAccount;
  return parsed;
}

/**
 * Get project ID from parsed service account.
 * Google's JSON uses project_id; TypeScript ServiceAccount uses projectId.
 */
export function getServiceAccountProjectId(
  sa: ParsedServiceAccount
): string | undefined {
  return sa.projectId ?? sa.project_id;
}
