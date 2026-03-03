/**
 * Admin base path and URL helpers.
 * Override via PUBLIC_ADMIN_BASE_PATH if needed.
 */
function normalizeBasePath(raw: string | undefined): string {
  const fallback = '/admin';
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes('://') || trimmed.includes('?')) return fallback;
  let path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1);
  return path || fallback;
}

const rawBasePath =
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: Record<string, string> }).env?.PUBLIC_ADMIN_BASE_PATH;

export const ADMIN_BASE_PATH = normalizeBasePath(
  typeof rawBasePath === 'string' ? rawBasePath : undefined
);

export const adminPaths = {
  root: ADMIN_BASE_PATH,
  login: `${ADMIN_BASE_PATH}/login`,
  home: import.meta.env.PUBLIC_SITE_URL || '/',
} as const;
