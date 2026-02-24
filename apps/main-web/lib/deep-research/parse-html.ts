import type { ParsedHtml } from '@/types/deep-research'

/**
 * Parse pasted HTML to extract title, excerpt, and body content.
 *
 * Uses different strategies depending on the environment:
 * - **Client-side (browser):** Uses DOMParser for accurate DOM-based parsing.
 * - **Server-side (Node/SSR):** Falls back to regex parsing since DOMParser is
 *   not available (no DOM in Node.js). Regex may miss edge cases but handles
 *   typical HTML from admin-pasted content.
 *
 * @param html - Raw HTML string (e.g., from clipboard or file)
 * @returns Parsed title, excerpt (from meta description), and body HTML
 */
export function parsePastedHtml(html: string): ParsedHtml {
  const trimmed = html.trim()
  if (!trimmed) {
    return { bodyHtml: '' }
  }

  let title: string | undefined
  let excerpt: string | undefined
  let bodyHtml: string

  // Client vs server strategy: DOMParser in browser, regex fallback in Node (see JSDoc above).
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(trimmed, 'text/html')
    title = doc.querySelector('title')?.textContent?.trim()
    const metaDesc = doc.querySelector('meta[name="description"]')
    excerpt = metaDesc?.getAttribute('content')?.trim()
    bodyHtml = doc.body?.innerHTML?.trim() ?? trimmed
  } else {
    const titleMatch = trimmed.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
    const metaMatch = trimmed.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    excerpt = metaMatch?.[1]?.trim()
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    bodyHtml = bodyMatch?.[1]?.trim() ?? trimmed
  }

  if (!bodyHtml && trimmed) {
    bodyHtml = trimmed
  }

  return {
    title,
    excerpt,
    bodyHtml: bodyHtml || trimmed,
  }
}
