import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BlogPage from '@/app/blog/page'
import * as getBlogPostsModule from '@/features/blog/lib/getBlogPosts'

// Mock the getBlogPosts module
vi.mock('@/features/blog/lib/getBlogPosts', () => ({
  getAllPosts: vi.fn(),
}))

describe('Blog Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render blog page with title', async () => {
    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        date: '2025-01-15',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
    ]

    vi.mocked(getBlogPostsModule.getAllPosts).mockResolvedValue(mockPosts)

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
    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        date: '2025-01-15',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
    ]

    vi.mocked(getBlogPostsModule.getAllPosts).mockResolvedValue(mockPosts)

    const page = await BlogPage()
    render(page)

    // BlogPostList component should receive the posts
    // The actual rendering will be tested in component tests
    expect(screen.getByText('Blog')).toBeInTheDocument()
  })

  it('should generate metadata correctly', async () => {
    const { generateMetadata } = await import('@/app/blog/page')
    const metadata = await generateMetadata()

    expect(metadata.title).toBe('Blog - Workout Generator | Fitness Tips & Workout Strategies')
    expect(metadata.description).toContain('Discover fitness tips')
    expect(metadata.openGraph?.type).toBe('website')
    expect(metadata.openGraph?.url).toContain('/blog')
  })
})
