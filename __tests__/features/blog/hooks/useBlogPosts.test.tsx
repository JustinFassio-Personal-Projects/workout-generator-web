import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBlogPosts } from '@/features/blog/hooks/useBlogPosts'

describe('useBlogPosts', () => {
  beforeEach(() => {
    // Reset window.location.origin for tests
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })
    // Mock global fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should initialize with loading state', () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

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

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPosts,
    } as Response)

    const { result } = renderHook(() => useBlogPosts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.posts).toEqual(mockPosts)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch errors correctly', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Failed to load posts'))

    const { result } = renderHook(() => useBlogPosts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.posts).toEqual([])
  })

  it('should handle non-ok responses correctly', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    const { result } = renderHook(() => useBlogPosts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Failed to fetch blog posts')
    expect(result.current.posts).toEqual([])
  })
})
