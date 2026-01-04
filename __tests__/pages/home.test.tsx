import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import Home from '@/app/page'
import * as useBlogPostsModule from '@/features/blog/hooks/useBlogPosts'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
    refresh: vi.fn(),
  },
}))

// Mock useBlogPosts hook
vi.mock('@/features/blog/hooks/useBlogPosts', () => ({
  useBlogPosts: vi.fn(),
}))

// Mock useScrollTracking
vi.mock('@/features/analytics/hooks/useScrollTracking', () => ({
  useScrollTracking: vi.fn(),
}))

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.className).toContain('min-h-screen')
  })

  it('should render structured data scripts', () => {
    render(<Home />)

    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBeGreaterThanOrEqual(3)
  })

  it('should include homepage schema in structured data', () => {
    render(<Home />)

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    const homepageScript = scripts.find(script => script.textContent?.includes('WebPage'))
    expect(homepageScript).toBeInTheDocument()
  })

  it('should include breadcrumb schema in structured data', () => {
    render(<Home />)

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    const breadcrumbScript = scripts.find(script => script.textContent?.includes('BreadcrumbList'))
    expect(breadcrumbScript).toBeInTheDocument()
  })

  it('should include FAQ schema in structured data', () => {
    render(<Home />)

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    const faqScript = scripts.find(script => script.textContent?.includes('FAQPage'))
    expect(faqScript).toBeInTheDocument()
  })
})
