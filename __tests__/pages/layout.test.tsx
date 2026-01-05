import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import RootLayout from '@/app/layout'

// Mock Next.js font loader
vi.mock('next/font/google', () => ({
  Inter: vi.fn(() => ({
    className: 'inter-font',
  })),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}))

// Mock useSupabaseUser hook
vi.mock('@/hooks/useSupabaseUser', () => ({
  useSupabaseUser: vi.fn(() => ({
    user: null,
    loading: false,
    error: null,
  })),
}))

describe('RootLayout', () => {
  let originalConsoleError: typeof console.error

  beforeEach(() => {
    // Suppress the validateDOMNesting warning for this test suite
    // since we're testing a Next.js layout that returns <html> which
    // React Testing Library wraps in a div (this is expected behavior)
    originalConsoleError = console.error
    console.error = vi.fn(message => {
      // Suppress only the validateDOMNesting warning for html/div nesting
      if (
        typeof message === 'string' &&
        message.includes('validateDOMNesting') &&
        message.includes('<html>')
      ) {
        return
      }
      originalConsoleError(message)
    })
  })

  afterEach(() => {
    console.error = originalConsoleError
  })

  it('should render root layout with children', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    )

    // Check the container structure (html is wrapped in div by React Testing Library)
    const htmlElement = container.querySelector('html')
    expect(htmlElement).toBeInTheDocument()
    expect(htmlElement?.querySelector('body')).toBeInTheDocument()
    expect(htmlElement?.getAttribute('lang')).toBe('en')
  })

  it('should render children inside body', () => {
    const { getByText } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    )

    expect(getByText('Test Content')).toBeInTheDocument()
  })
})
