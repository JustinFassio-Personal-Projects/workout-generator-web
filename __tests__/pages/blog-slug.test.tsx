import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllPostSlugs, getPostBySlug } from '@/features/blog/lib/getBlogPosts'

// Mock the blog post functions
vi.mock('@/features/blog/lib/getBlogPosts', () => ({
  getAllPostSlugs: vi.fn(),
  getPostBySlug: vi.fn(),
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

  it('should generate static params', async () => {
    const { generateStaticParams } = await import('@/app/blog/[slug]/page')
    const mockSlugs = ['post-1', 'post-2', 'post-3']
    vi.mocked(getAllPostSlugs).mockResolvedValue(mockSlugs)

    const params = await generateStaticParams()

    expect(params).toEqual([
      { slug: 'post-1' },
      { slug: 'post-2' },
      { slug: 'post-3' },
    ])
  })

  it('should render blog post page when post exists', async () => {
    const { default: BlogPostPage } = await import('@/app/blog/[slug]/page')
    const mockPost = {
      id: '1',
      slug: 'test-post',
      title: 'Test Post',
      excerpt: 'Test excerpt',
      content: 'Test content',
      date: '2025-01-15',
      author: 'Test Author',
      category: 'Test',
      tags: ['test'],
    }

    vi.mocked(getPostBySlug).mockResolvedValue(mockPost)

    const result = await BlogPostPage({ params: { slug: 'test-post' } })

    expect(getPostBySlug).toHaveBeenCalledWith('test-post')
    expect(result).toBeDefined()
  })

  it('should call notFound when post does not exist', async () => {
    const { default: BlogPostPage } = await import('@/app/blog/[slug]/page')
    vi.mocked(getPostBySlug).mockResolvedValue(null)

    await expect(BlogPostPage({ params: { slug: 'non-existent' } })).rejects.toThrow('notFound')
    expect(getPostBySlug).toHaveBeenCalledWith('non-existent')
    expect(mockNotFound).toHaveBeenCalled()
  })
})

