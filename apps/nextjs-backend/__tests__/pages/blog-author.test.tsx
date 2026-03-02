import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the blog query functions
vi.mock('@/lib/blog/queries', () => ({
  getAllAuthors: vi.fn(),
  getPostsByAuthor: vi.fn(),
  getAuthorBySlug: vi.fn(),
  authorToSlug: vi.fn(),
}))

// Mock notFound
const mockNotFound = vi.fn(() => {
  throw new Error('notFound')
})

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}))

describe('AuthorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate static params (returns empty for ISR)', async () => {
    const { generateStaticParams } = await import('@/app/blog/author/[name]/page')
    const params = await generateStaticParams()

    expect(params).toEqual([])
  }, 10000)

  it('should render author page when author exists', async () => {
    const { getAuthorBySlug, getPostsByAuthor } = await import('@/lib/blog/queries')
    const { default: AuthorPage } = await import('@/app/blog/author/[name]/page')

    const mockAuthor = {
      id: '1',
      name: 'Test Author',
      slug: 'test-author',
      bio: 'Test bio',
      avatar: null,
      created_at: '2025-01-01T00:00:00Z',
    }

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
        author: mockAuthor,
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
      },
    ]

    vi.mocked(getAuthorBySlug).mockResolvedValue(mockAuthor)
    vi.mocked(getPostsByAuthor).mockResolvedValue(mockPosts)

    const result = await AuthorPage({ params: Promise.resolve({ name: 'test-author' }) })

    expect(getAuthorBySlug).toHaveBeenCalledWith('test-author')
    expect(getPostsByAuthor).toHaveBeenCalledWith('test-author')
    expect(result).toBeDefined()
  })

  it('should call notFound when author does not exist', async () => {
    const { getAuthorBySlug } = await import('@/lib/blog/queries')
    const { default: AuthorPage } = await import('@/app/blog/author/[name]/page')

    vi.mocked(getAuthorBySlug).mockResolvedValue(null)

    await expect(AuthorPage({ params: Promise.resolve({ name: 'non-existent' }) })).rejects.toThrow(
      'notFound'
    )
    expect(getAuthorBySlug).toHaveBeenCalledWith('non-existent')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('should generate metadata correctly when author exists', async () => {
    const { getAuthorBySlug } = await import('@/lib/blog/queries')
    const { generateMetadata } = await import('@/app/blog/author/[name]/page')

    const mockAuthor = {
      id: '1',
      name: 'Test Author',
      slug: 'test-author',
      bio: 'Test bio',
      avatar: null,
      created_at: '2025-01-01T00:00:00Z',
    }

    vi.mocked(getAuthorBySlug).mockResolvedValue(mockAuthor)

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'test-author' }),
    })

    expect(metadata.title).toBe('Articles by Test Author | Blog')
    expect(metadata.description).toBe('Test bio')
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe('website')
  })

  it('should return not found metadata when author does not exist', async () => {
    const { getAuthorBySlug } = await import('@/lib/blog/queries')
    const { generateMetadata } = await import('@/app/blog/author/[name]/page')

    vi.mocked(getAuthorBySlug).mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ name: 'non-existent' }),
    })

    expect(metadata.title).toBe('Author Not Found - Workout Generator')
  })
})
