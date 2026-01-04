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

  it('should handle empty posts array', async () => {
    const { getAllPublishedPosts } = await import('@/lib/blog/queries')

    vi.mocked(getAllPublishedPosts).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    expect(getAllPublishedPosts).toHaveBeenCalledTimes(1)
  })

  it('should handle posts with featured images', async () => {
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
        featured_image: '/images/test.jpg',
        category_id: '1',
        author_id: '1',
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].image).toBe('/images/test.jpg')
  })

  it('should handle posts with missing author', async () => {
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
        author: null,
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

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].author).toBe('Unknown')
  })

  it('should handle posts with missing category', async () => {
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
        category: null,
        tags: ['test'],
        featured_image: null,
        category_id: '1',
        author_id: '1',
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].category).toBe('Uncategorized')
  })

  it('should handle posts with empty tags array', async () => {
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
        tags: [],
        featured_image: null,
        category_id: '1',
        author_id: '1',
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].tags).toEqual([])
  })

  it('should handle posts with null tags', async () => {
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
        tags: [],
        featured_image: null,
        category_id: '1',
        author_id: '1',
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].tags).toEqual([])
  })

  it('should use created_at when published_at is null', async () => {
    const { getAllPublishedPosts } = await import('@/lib/blog/queries')

    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        published_at: null,
        created_at: '2025-01-10T00:00:00Z',
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

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].date).toBe('2025-01-10T00:00:00Z')
  })

  it('should handle errors gracefully', async () => {
    const { getAllPublishedPosts } = await import('@/lib/blog/queries')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(getAllPublishedPosts).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch blog posts' })
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching blog posts:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('should handle multiple posts correctly', async () => {
    const { getAllPublishedPosts } = await import('@/lib/blog/queries')

    const mockPosts = [
      {
        id: '1',
        slug: 'test-post-1',
        title: 'Test Post 1',
        excerpt: 'Test excerpt 1',
        content: 'Test content 1',
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
      {
        id: '2',
        slug: 'test-post-2',
        title: 'Test Post 2',
        excerpt: 'Test excerpt 2',
        content: 'Test content 2',
        published_at: '2025-01-16T00:00:00Z',
        created_at: '2025-01-16T00:00:00Z',
        updated_at: '2025-01-16T00:00:00Z',
        author: {
          name: 'Test Author 2',
          slug: 'test-author-2',
          id: '2',
          bio: null,
          avatar: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        category: {
          name: 'Test 2',
          slug: 'test-2',
          id: '2',
          description: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        tags: ['test', 'fitness'],
        featured_image: '/images/test2.jpg',
        category_id: '2',
        author_id: '2',
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].slug).toBe('test-post-1')
    expect(data[1].slug).toBe('test-post-2')
  })
})
