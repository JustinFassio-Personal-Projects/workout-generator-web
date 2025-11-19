import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBlogPosts } from '@/features/blog/hooks/useBlogPosts'
import * as getBlogPostsModule from '@/features/blog/lib/getBlogPosts'

// Mock the getBlogPosts module
vi.mock('@/features/blog/lib/getBlogPosts', () => ({
  getAllPosts: vi.fn(),
}))

describe('useBlogPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    vi.mocked(getBlogPostsModule.getAllPosts).mockResolvedValue([])

    const { result } = renderHook(() => useBlogPosts())

    expect(result.current.loading).toBe(true)
    expect(result.current.posts).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should load posts successfully', async () => {
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

    const { result } = renderHook(() => useBlogPosts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.posts).toEqual(mockPosts)
    expect(result.current.error).toBeNull()
  })

  it('should handle errors correctly', async () => {
    const mockError = new Error('Failed to load posts')
    vi.mocked(getBlogPostsModule.getAllPosts).mockRejectedValue(mockError)

    const { result } = renderHook(() => useBlogPosts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe(mockError)
    expect(result.current.posts).toEqual([])
  })
})
