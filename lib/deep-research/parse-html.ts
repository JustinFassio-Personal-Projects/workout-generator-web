import type { ParsedHtml } from '@/types/deep-research'

/**
 * Parse pasted HTML to extract title, excerpt, and body content.
 * Runs client-side (uses DOMParser) or server-side (regex fallback).
 */
export function parsePastedHtml(html: string): ParsedHtml {
  const trimmed = html.trim()
  if (!trimmed) {
    return { bodyHtml: '' }
  }

  let title: string | undefined
  let excerpt: string | undefined
  let bodyHtml: string

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
