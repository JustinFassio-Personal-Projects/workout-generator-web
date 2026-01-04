import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the blog query functions from new location
vi.mock('@/lib/blog/queries', () => ({
  getAllPostSlugs: vi.fn(),
  getPostBySlug: vi.fn(),
  getRelatedPosts: vi.fn(),
}))

// Mock notFound
const mockNotFound = vi.fn(() => {
  throw new Error('notFound')
})

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}))

describe('BlogPostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate static params (returns empty for ISR)', async () => {
    const { generateStaticParams } = await import('@/app/blog/[slug]/page')
    const params = await generateStaticParams()

    // generateStaticParams now returns empty array for dynamic ISR generation
    expect(params).toEqual([])
  }, 10000)

  it('should render blog post page when post exists', async () => {
    const { getPostBySlug, getRelatedPosts } = await import('@/lib/blog/queries')
    const { default: BlogPostPage } = await import('@/app/blog/[slug]/page')

    const mockPost = {
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
      category_id: '1',
      author_id: '1',
      featured_image: null,
      status: 'published' as const,
      seo_title: null,
      seo_description: null,
    }

    vi.mocked(getPostBySlug).mockResolvedValue(mockPost)
    vi.mocked(getRelatedPosts).mockResolvedValue([])

    // Pass params as a Promise (Next.js 15 format)
    const result = await BlogPostPage({ params: Promise.resolve({ slug: 'test-post' }) })

    expect(getPostBySlug).toHaveBeenCalledWith('test-post')
    expect(getRelatedPosts).toHaveBeenCalled()
    expect(result).toBeDefined()
  })

  it('should call notFound when post does not exist', async () => {
    const { getPostBySlug } = await import('@/lib/blog/queries')
    const { default: BlogPostPage } = await import('@/app/blog/[slug]/page')

    vi.mocked(getPostBySlug).mockResolvedValue(null)

    await expect(
      BlogPostPage({ params: Promise.resolve({ slug: 'non-existent' }) })
    ).rejects.toThrow('notFound')
    expect(getPostBySlug).toHaveBeenCalledWith('non-existent')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('should generate metadata correctly when post exists', async () => {
    const { getPostBySlug } = await import('@/lib/blog/queries')
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    const mockPost = {
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
      tags: ['test', 'fitness'],
      category_id: '1',
      author_id: '1',
      featured_image: null,
      status: 'published' as const,
      seo_title: null,
      seo_description: null,
    }

    vi.mocked(getPostBySlug).mockResolvedValue(mockPost)

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'test-post' }) })

    expect(metadata.title).toBe('Test Post | Blog')
    expect(metadata.description).toBe('Test excerpt')
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe('article')
    expect(metadata.openGraph?.title).toBe('Test Post')
  })

  it('should return not found metadata when post does not exist', async () => {
    const { getPostBySlug } = await import('@/lib/blog/queries')
    const { generateMetadata } = await import('@/app/blog/[slug]/page')

    vi.mocked(getPostBySlug).mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'non-existent' }),
    })

    expect(metadata.title).toBe('Post Not Found - Workout Generator')
  })
})
