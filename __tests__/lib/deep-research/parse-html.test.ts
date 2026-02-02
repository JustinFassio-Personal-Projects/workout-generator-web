import { describe, it, expect } from 'vitest'
import { parsePastedHtml } from '@/lib/deep-research/parse-html'

describe('parsePastedHtml', () => {
  it('should return empty bodyHtml for empty string', () => {
    const result = parsePastedHtml('')
    expect(result).toEqual({ bodyHtml: '' })
  })

  it('should return empty bodyHtml for whitespace-only string', () => {
    const result = parsePastedHtml('   \n\t  ')
    expect(result).toEqual({ bodyHtml: '' })
  })

  it('should extract title from <title> tag (DOMParser path)', () => {
    const html = '<html><head><title>My Title</title></head><body><p>Content</p></body></html>'
    const result = parsePastedHtml(html)
    expect(result.title).toBe('My Title')
    expect(result.bodyHtml).toContain('<p>Content</p>')
  })

  it('should extract excerpt from meta description (DOMParser path)', () => {
    const html =
      '<html><head><meta name="description" content="A short description"></head><body>Body</body></html>'
    const result = parsePastedHtml(html)
    expect(result.excerpt).toBe('A short description')
  })

  it('should use trimmed body HTML', () => {
    const html = '<body><h1>Hello</h1></body>'
    const result = parsePastedHtml(html)
    expect(result.bodyHtml).toContain('<h1>Hello</h1>')
  })

  it('should fall back to full trimmed input when no body tag', () => {
    const html = '<p>Standalone content</p>'
    const result = parsePastedHtml(html)
    expect(result.bodyHtml).toBe(html)
  })

  it('should handle content without title or excerpt', () => {
    const html = '<div>Just content</div>'
    const result = parsePastedHtml(html)
    expect(result.title).toBeUndefined()
    expect(result.excerpt).toBeUndefined()
    expect(result.bodyHtml).toContain('Just content')
  })

  it('should use regex fallback when DOMParser is undefined (server-side)', () => {
    const originalDOMParser = global.DOMParser
    // @ts-expect-error - simulating SSR where DOMParser is undefined
    global.DOMParser = undefined
    try {
      const html =
        '<html><head><title>Server Title</title><meta name="description" content="Server desc"></head><body><p>Body content</p></body></html>'
      const result = parsePastedHtml(html)
      expect(result.title).toBe('Server Title')
      expect(result.excerpt).toBe('Server desc')
      expect(result.bodyHtml).toContain('<p>Body content</p>')
    } finally {
      global.DOMParser = originalDOMParser
    }
  })
})
