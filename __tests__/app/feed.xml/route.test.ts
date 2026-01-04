import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client at the top level before any imports
vi.mock('@supabase/supabase-js', () => {
  const mockPosts = [
    {
      slug: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      published_at: '2025-01-15T00:00:00Z',
      created_at: '2025-01-15T00:00:00Z',
      featured_image: '/test-image.jpg',
      author: [{ name: 'Test Author' }],
      category: [{ name: 'Test' }],
    },
  ]

  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockPosts })),
          })),
        })),
      })),
    })),
  }
})

describe('feed.xml route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate valid RSS feed XML', async () => {
    const { GET } = await import('@/app/feed.xml/route')
    const response = await GET()
    const text = await response.text()

    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8')
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(text).toContain('<rss version="2.0"')
    expect(text).toContain('<channel>')
    expect(text).toContain('<title>Workout Generator Blog</title>')
  })

  it('should set proper cache headers', async () => {
    const { GET } = await import('@/app/feed.xml/route')
    const response = await GET()

    expect(response.headers.get('cache-control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400'
    )
  })

  it('should include required RSS channel elements', async () => {
    const { GET } = await import('@/app/feed.xml/route')
    const response = await GET()
    const text = await response.text()

    expect(text).toContain('<description>')
    expect(text).toContain('<link>')
    expect(text).toContain('<language>en-US</language>')
    expect(text).toContain('<atom:link')
    expect(text).toContain('<lastBuildDate>')
  })
})
