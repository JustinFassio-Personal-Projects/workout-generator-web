import { describe, it, expect } from 'vitest'
import {
  validateDeepResearchPayload,
  HTML_CONTENT_MAX_SIZE,
  type ValidationResult,
} from '@/lib/deep-research/validation'

describe('validateDeepResearchPayload', () => {
  const validPayload = {
    title: 'Test Title',
    slug: 'test-slug',
    html_content: '<p>Content</p>',
  }

  it('should return ok:true for valid payload with required fields only', () => {
    const result = validateDeepResearchPayload(validPayload)
    expect(result).toEqual({ ok: true })
  })

  it('should return ok:true for valid payload with optional excerpt', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      excerpt: 'Optional excerpt',
    })
    expect(result).toEqual({ ok: true })
  })

  it('should return error for null payload', () => {
    const result = validateDeepResearchPayload(null) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid payload')
    expect(result.status).toBe(400)
  })

  it('should return error for undefined payload', () => {
    const result = validateDeepResearchPayload(undefined) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid payload')
    expect(result.status).toBe(400)
  })

  it('should return error for non-object payload', () => {
    const result = validateDeepResearchPayload('string') as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid payload')
    expect(result.status).toBe(400)
  })

  it('should return error for empty title', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      title: '',
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Missing or invalid required fields')
    expect(result.status).toBe(400)
  })

  it('should return error for whitespace-only title', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      title: '   ',
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Missing or invalid required fields')
    expect(result.status).toBe(400)
  })

  it('should return error for non-string title', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      title: 123,
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Missing or invalid required fields')
    expect(result.status).toBe(400)
  })

  it('should return error for empty slug', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      slug: '',
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Missing or invalid required fields')
    expect(result.status).toBe(400)
  })

  it('should return error for whitespace-only slug', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      slug: '   ',
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Missing or invalid required fields')
    expect(result.status).toBe(400)
  })

  it('should return error for empty html_content', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      html_content: '',
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Missing or invalid required fields')
    expect(result.status).toBe(400)
  })

  it('should return error for non-string excerpt when provided', () => {
    const result = validateDeepResearchPayload({
      ...validPayload,
      excerpt: 42,
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toBe('excerpt must be a string if provided')
    expect(result.status).toBe(400)
  })

  it('should return error when html_content exceeds max size', () => {
    const bigContent = 'x'.repeat(HTML_CONTENT_MAX_SIZE + 1)
    const result = validateDeepResearchPayload({
      ...validPayload,
      html_content: bigContent,
    }) as ValidationResult
    expect(result.ok).toBe(false)
    expect(result.error).toBe('HTML content exceeds maximum size (500KB)')
    expect(result.status).toBe(400)
  })

  it('should accept html_content at exactly max size', () => {
    const atLimit = 'x'.repeat(HTML_CONTENT_MAX_SIZE)
    const result = validateDeepResearchPayload({
      ...validPayload,
      html_content: atLimit,
    })
    expect(result).toEqual({ ok: true })
  })
})

describe('HTML_CONTENT_MAX_SIZE', () => {
  it('should be 500 * 1024 (500KB)', () => {
    expect(HTML_CONTENT_MAX_SIZE).toBe(500 * 1024)
  })
})
