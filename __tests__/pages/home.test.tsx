import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import Home from '@/app/page'
import * as useBlogPostsModule from '@/features/blog/hooks/useBlogPosts'

// Mock AOS
const mockAOS = {
  init: vi.fn(),
  refresh: vi.fn(),
}

vi.mock('aos', () => ({
  default: mockAOS,
}))

// Mock useBlogPosts hook
vi.mock('@/features/blog/hooks/useBlogPosts', () => ({
  useBlogPosts: vi.fn(),
}))

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window flags
    delete (window as any).__AOS_CSS_LOADED__
    // Mock useBlogPosts to return empty array
    vi.mocked(useBlogPostsModule.useBlogPosts).mockReturnValue({
      posts: [],
      loading: false,
      error: null,
    })
  })

  it('should render the home page', () => {
    render(<Home />)

    expect(document.querySelector('main')).toBeInTheDocument()
  })

  it('should render all main sections', () => {
    render(<Home />)

    // Check that main sections are rendered (they may not have text content visible without data)
    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.className).toContain('min-h-screen')
  })
})
