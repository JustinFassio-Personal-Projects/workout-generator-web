/**
 * Parse FIREBASE_SERVICE_ACCOUNT_KEY from environment.
 * Handles surrounding quotes (common when secrets are stored with extra quoting).
 */

export interface ParsedServiceAccount extends Record<string, unknown> {
  projectId?: string;
  project_id?: string;
}

export function parseServiceAccountKey(raw: string): ParsedServiceAccount {
  let keyStr = raw.trim();
  if (
    (keyStr.startsWith("'") && keyStr.endsWith("'")) ||
    (keyStr.startsWith('"') && keyStr.endsWith('"'))
  ) {
    keyStr = keyStr.slice(1, -1);
  }
  return JSON.parse(keyStr) as ParsedServiceAccount;
}

export function getServiceAccountProjectId(
  sa: ParsedServiceAccount
): string | undefined {
  return sa.projectId ?? sa.project_id;
}
