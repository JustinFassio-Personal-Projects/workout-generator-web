import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/blog/route'

// Mock the new Supabase queries
vi.mock('@/lib/blog/queries', () => ({
  getAllPublishedPosts: vi.fn(),
}))

describe('Blog API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return blog posts successfully', async () => {
    const { getAllPublishedPosts } = await import('@/lib/blog/queries')

    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        published_at: '2025-01-15T00:00:00Z',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        author: {
          name: 'Test Author',
          slug: 'test-author',
          id: '1',
          bio: null,
          avatar: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        category: {
          name: 'Test',
          slug: 'test',
          id: '1',
          description: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        tags: ['test'],
        featured_image: null,
        category_id: '1',
        author_id: '1',
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    const expectedTransformedPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        date: '2025-01-15T00:00:00Z',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
        image: undefined,
      },
    ]

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(expectedTransformedPosts)
    expect(getAllPublishedPosts).toHaveBeenCalledTimes(1)
  })

  it('should handle errors gracefully', async () => {
    const { getAllPublishedPosts } = await import('@/lib/blog/queries')

    vi.mocked(getAllPublishedPosts).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch blog posts' })
  })
})
