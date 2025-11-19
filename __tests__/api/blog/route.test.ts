import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/blog/route'
import * as getBlogPostsModule from '@/features/blog/lib/getBlogPosts'

// Mock the getBlogPosts module
vi.mock('@/features/blog/lib/getBlogPosts', () => ({
  getAllPosts: vi.fn(),
}))

describe('Blog API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return blog posts successfully', async () => {
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

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockPosts)
    expect(getBlogPostsModule.getAllPosts).toHaveBeenCalledTimes(1)
  })

  it('should handle errors and return 500 status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getBlogPostsModule.getAllPosts).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Failed to fetch blog posts' })
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})

