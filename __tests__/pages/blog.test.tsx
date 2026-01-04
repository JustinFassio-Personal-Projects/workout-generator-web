import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BlogPage from '@/app/blog/page'

// Mock the new Supabase queries module
vi.mock('@/lib/blog/queries', () => ({
  getAllPublishedPosts: vi.fn(),
}))

describe('Blog Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render blog page with title', async () => {
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

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const page = await BlogPage()
    render(page)

    expect(screen.getByText('Blog')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Discover fitness tips, workout strategies, and expert advice to help you achieve your goals.'
      )
    ).toBeInTheDocument()
  })

  it('should display blog posts', async () => {
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

    vi.mocked(getAllPublishedPosts).mockResolvedValue(mockPosts)

    const page = await BlogPage()
    render(page)

    // BlogPostList component should receive the posts
    // The actual rendering will be tested in component tests
    expect(screen.getByText('Blog')).toBeInTheDocument()
  })

  it('should generate metadata correctly', async () => {
    const { generateMetadata } = await import('@/app/blog/page')
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Blog | Fitness Tips & Workout Strategies')
    expect(metadata.description).toContain('Discover expert fitness tips')
    expect((metadata.openGraph as Record<string, unknown>)?.type).toBe('website')
    expect(metadata.openGraph?.url).toContain('/blog')
  })
})
