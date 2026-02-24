/**
 * Admin API payload validation for deep research create/update.
 * Shared across POST (create) and PUT (update) endpoints for consistency.
 */

// Conservative max HTML content size to keep payloads small and within typical DB/performance constraints
const HTML_CONTENT_MAX_SIZE = 500 * 1024 // 500KB

export { HTML_CONTENT_MAX_SIZE }

export type ValidationResult = { ok: true } | { ok: false; error: string; status: number }

/**
 * Validates required fields (title, slug, html_content) and optional excerpt
 * for deep research create/update payloads. Also enforces HTML content max size.
 */
export function validateDeepResearchPayload(data: unknown): ValidationResult {
  if (data == null || typeof data !== 'object') {
    return { ok: false, error: 'Invalid payload', status: 400 }
  }

  const raw = data as Record<string, unknown>

  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    return {
      ok: false,
      error: 'Missing or invalid required fields: title, slug, html_content',
      status: 400,
    }
  }

  if (typeof raw.slug !== 'string' || raw.slug.trim().length === 0) {
    return {
      ok: false,
      error: 'Missing or invalid required fields: title, slug, html_content',
      status: 400,
    }
  }

  if (typeof raw.html_content !== 'string' || raw.html_content.trim().length === 0) {
    return {
      ok: false,
      error: 'Missing or invalid required fields: title, slug, html_content',
      status: 400,
    }
  }

  if (raw.excerpt != null && typeof raw.excerpt !== 'string') {
    return { ok: false, error: 'excerpt must be a string if provided', status: 400 }
  }

  if (raw.html_content.length > HTML_CONTENT_MAX_SIZE) {
    return {
      ok: false,
      error: 'HTML content exceeds maximum size (500KB)',
      status: 400,
    }
  }

  return { ok: true }
}
