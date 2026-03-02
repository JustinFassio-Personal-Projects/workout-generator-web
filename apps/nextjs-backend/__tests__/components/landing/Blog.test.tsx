import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Blog } from '@/components/landing/Blog/Blog'
import * as useBlogPostsModule from '@/features/blog/hooks/useBlogPosts'

// Mock the useBlogPosts hook
vi.mock('@/features/blog/hooks/useBlogPosts', () => ({
  useBlogPosts: vi.fn(),
}))

describe('Blog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render nothing when loading', () => {
    vi.mocked(useBlogPostsModule.useBlogPosts).mockReturnValue({
      posts: [],
      loading: true,
      error: null,
    })

    const { container } = render(<Blog />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when no posts available', () => {
    vi.mocked(useBlogPostsModule.useBlogPosts).mockReturnValue({
      posts: [],
      loading: false,
      error: null,
    })

    const { container } = render(<Blog />)
    expect(container.firstChild).toBeNull()
  })

  it('should render blog section with posts', () => {
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
      {
        id: '3',
        slug: 'test-post-3',
        title: 'Test Post 3',
        excerpt: 'Test excerpt 3',
        content: 'Test content 3',
        date: '2025-01-13',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
    ]

    vi.mocked(useBlogPostsModule.useBlogPosts).mockReturnValue({
      posts: mockPosts,
      loading: false,
      error: null,
    })

    render(<Blog />)

    expect(screen.getByText('Latest from Our')).toBeInTheDocument()
    expect(screen.getByText('Blog')).toBeInTheDocument()
    expect(screen.getByText('View All Posts')).toBeInTheDocument()
  })

  it('should only show first 3 posts', () => {
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
      {
        id: '3',
        slug: 'test-post-3',
        title: 'Test Post 3',
        excerpt: 'Test excerpt 3',
        content: 'Test content 3',
        date: '2025-01-13',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
      {
        id: '4',
        slug: 'test-post-4',
        title: 'Test Post 4',
        excerpt: 'Test excerpt 4',
        content: 'Test content 4',
        date: '2025-01-12',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
    ]

    vi.mocked(useBlogPostsModule.useBlogPosts).mockReturnValue({
      posts: mockPosts,
      loading: false,
      error: null,
    })

    render(<Blog />)

    // Should only render first 3 posts
    expect(screen.getByText('Test Post 1')).toBeInTheDocument()
    expect(screen.getByText('Test Post 2')).toBeInTheDocument()
    expect(screen.getByText('Test Post 3')).toBeInTheDocument()
    expect(screen.queryByText('Test Post 4')).not.toBeInTheDocument()
  })
})
