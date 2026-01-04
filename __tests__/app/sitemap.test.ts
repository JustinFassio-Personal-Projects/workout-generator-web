import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client at the top level before any imports
vi.mock('@supabase/supabase-js', () => {
  const mockPosts = [
    {
      slug: 'test-post-1',
      updated_at: '2025-01-15T00:00:00Z',
      published_at: '2025-01-15T00:00:00Z',
      created_at: '2025-01-15T00:00:00Z',
    },
    {
      slug: 'test-post-2',
      updated_at: '2025-01-14T00:00:00Z',
      published_at: '2025-01-14T00:00:00Z',
      created_at: '2025-01-14T00:00:00Z',
    },
  ]

  const mockAuthors = [{ slug: 'test-author' }]
  const mockCategories = [{ slug: 'test' }]

  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'posts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockPosts })),
              })),
            })),
          }
        }
        if (table === 'authors') {
          return {
            select: vi.fn(() => Promise.resolve({ data: mockAuthors })),
          }
        }
        if (table === 'categories') {
          return {
            select: vi.fn(() => Promise.resolve({ data: mockCategories })),
          }
        }
        return {
          select: vi.fn(() => Promise.resolve({ data: [] })),
        }
      }),
    })),
  }
})

describe('sitemap.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate sitemap with required pages', async () => {
    const sitemap = (await import('@/app/sitemap')).default
    const result = await sitemap()

    // Should have at least homepage, blog page, and videos
    expect(result.length).toBeGreaterThanOrEqual(3)

    // Check homepage
    expect(result[0]).toEqual({
      url: expect.stringContaining('aiworkoutgenerator.com'),
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 1.0,
    })

    // Check blog page
    expect(result[1]).toEqual({
      url: expect.stringContaining('/blog'),
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 0.8,
    })

    // Check videos
    expect(result[2]).toEqual({
      url: expect.stringContaining('#videos'),
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  })

  it('should use correct base URL from environment', async () => {
    const sitemap = (await import('@/app/sitemap')).default
    const result = await sitemap()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

    expect(result[0].url).toBe(baseUrl)
    expect(result[1].url).toBe(`${baseUrl}/blog`)
  })

  it('should include lastModified dates', async () => {
    const sitemap = (await import('@/app/sitemap')).default
    const result = await sitemap()

    result.forEach(entry => {
      expect(entry.lastModified).toBeInstanceOf(Date)
    })
  })
})
