import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the blog query functions
vi.mock('@/lib/blog/queries', () => ({
  getAllCategories: vi.fn(),
  getPostsByCategory: vi.fn(),
  getCategoryBySlug: vi.fn(),
}))

// Mock notFound
const mockNotFound = vi.fn(() => {
  throw new Error('notFound')
})

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}))

describe('CategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate static params (returns empty for ISR)', async () => {
    const { generateStaticParams } = await import('@/app/blog/category/[slug]/page')
    const params = await generateStaticParams()

    expect(params).toEqual([])
  }, 10000)

  it('should render category page when category exists', async () => {
    const { getCategoryBySlug, getPostsByCategory } = await import('@/lib/blog/queries')
    const { default: CategoryPage } = await import('@/app/blog/category/[slug]/page')

    const mockCategory = {
      id: '1',
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test description',
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
        author: {
          name: 'Test Author',
          slug: 'test-author',
          id: '1',
          bio: null,
          avatar: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        category: mockCategory,
        tags: ['test'],
        category_id: '1',
        author_id: '1',
        featured_image: null,
        status: 'published' as const,
        seo_title: null,
        seo_description: null,
      },
    ]

    vi.mocked(getCategoryBySlug).mockResolvedValue(mockCategory)
    vi.mocked(getPostsByCategory).mockResolvedValue(mockPosts)

    const result = await CategoryPage({ params: Promise.resolve({ slug: 'test-category' }) })

    expect(getCategoryBySlug).toHaveBeenCalledWith('test-category')
    expect(getPostsByCategory).toHaveBeenCalledWith('test-category')
    expect(result).toBeDefined()
  })

  it('should call notFound when category does not exist', async () => {
    const { getCategoryBySlug } = await import('@/lib/blog/queries')
    const { default: CategoryPage } = await import('@/app/blog/category/[slug]/page')

    vi.mocked(getCategoryBySlug).mockResolvedValue(null)

    await expect(
      CategoryPage({ params: Promise.resolve({ slug: 'non-existent' }) })
    ).rejects.toThrow('notFound')
    expect(getCategoryBySlug).toHaveBeenCalledWith('non-existent')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('should generate metadata correctly when category exists', async () => {
    const { getCategoryBySlug } = await import('@/lib/blog/queries')
    const { generateMetadata } = await import('@/app/blog/category/[slug]/page')

    const mockCategory = {
      id: '1',
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test description',
      created_at: '2025-01-01T00:00:00Z',
    }

    vi.mocked(getCategoryBySlug).mockResolvedValue(mockCategory)

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'test-category' }),
    })

    expect(metadata.title).toBe('Test Category | Blog')
    expect(metadata.description).toBe('Test description')
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe('website')
  })

  it('should return not found metadata when category does not exist', async () => {
    const { getCategoryBySlug } = await import('@/lib/blog/queries')
    const { generateMetadata } = await import('@/app/blog/category/[slug]/page')

    vi.mocked(getCategoryBySlug).mockResolvedValue(null)

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'non-existent' }),
    })

    expect(metadata.title).toBe('Category Not Found - Workout Generator')
  })
})
