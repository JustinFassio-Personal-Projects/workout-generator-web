export interface ParsedHtml {
  bodyHtml: string
  title?: string
  excerpt?: string
}

/**
 * Parses pasted HTML (e.g. from a browser) into bodyHtml and optional title/excerpt.
 * Uses DOMParser when available (browser); falls back to regex when undefined (e.g. SSR).
 */
export function parsePastedHtml(html: string): ParsedHtml {
  const trimmed = html.trim()
  if (!trimmed) {
    return { bodyHtml: '' }
  }

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(trimmed, 'text/html')
    const title =
      doc.querySelector('title')?.textContent?.trim() ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
    const excerpt =
      doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim()
    const body = doc.body
    const bodyHtml = body ? body.innerHTML.trim() : trimmed
    return {
      bodyHtml,
      ...(title && { title }),
      ...(excerpt && { excerpt }),
    }
  }

  // Fallback when DOMParser is undefined (e.g. server-side)
  const titleMatch = trimmed.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
  const descMatch = trimmed.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
  const excerpt = descMatch?.[1]?.trim()
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch?.[1]?.trim() ?? trimmed
  return {
    bodyHtml,
    ...(title && { title }),
    ...(excerpt && { excerpt }),
  }
}
