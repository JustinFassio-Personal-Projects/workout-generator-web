import { describe, it, expect, vi, beforeEach } from 'vitest'
import sitemap from '@/app/sitemap'
import * as getBlogPostsModule from '@/features/blog/lib/getBlogPosts'

// Mock the getBlogPosts module
vi.mock('@/features/blog/lib/getBlogPosts', () => ({
  getAllPosts: vi.fn(),
}))

describe('sitemap.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate sitemap with homepage and blog pages', async () => {
    const mockPosts = [
      {
        id: '1',
        slug: 'test-post-1',
        title: 'Test Post 1',
        excerpt: 'Test excerpt 1',
        content: 'Test content 1',
        date: '2025-01-15',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
      {
        id: '2',
        slug: 'test-post-2',
        title: 'Test Post 2',
        excerpt: 'Test excerpt 2',
        content: 'Test content 2',
        date: '2025-01-14',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
    ]

    vi.mocked(getBlogPostsModule.getAllPosts).mockResolvedValue(mockPosts)

    const result = await sitemap()

    expect(result).toHaveLength(4) // homepage + blog page + 2 blog posts
    expect(result[0]).toEqual({
      url: expect.stringContaining('workoutgenerator.com'),
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 1.0,
    })
    expect(result[1]).toEqual({
      url: expect.stringContaining('/blog'),
      lastModified: expect.any(Date),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    expect(result[2]).toEqual({
      url: expect.stringContaining('/blog/test-post-1'),
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
    expect(result[3]).toEqual({
      url: expect.stringContaining('/blog/test-post-2'),
      lastModified: expect.any(Date),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  })

  it('should use correct base URL from environment', async () => {
    vi.mocked(getBlogPostsModule.getAllPosts).mockResolvedValue([])

    const result = await sitemap()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

    expect(result[0].url).toBe(baseUrl)
    expect(result[1].url).toBe(`${baseUrl}/blog`)
  })

  it('should handle empty posts list', async () => {
    vi.mocked(getBlogPostsModule.getAllPosts).mockResolvedValue([])

    const result = await sitemap()

    expect(result).toHaveLength(2) // homepage + blog page
    expect(result[1].lastModified).toBeInstanceOf(Date)
  })
})

