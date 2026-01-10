import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href, ...props }, children)
  },
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, unoptimized, ...props }: any) => {
    // Note: unoptimized is a Next.js Image prop, not an HTML attribute, so we don't pass it to img
    // Using img element in tests is acceptable for mocking Next.js Image
    return React.createElement('img', {
      src: typeof src === 'string' && src.startsWith('/') ? `http://localhost:3000${src}` : src,
      alt,
      width,
      height,
      ...props,
    })
  },
}))

// Mock AOS (Animate On Scroll)
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
    refresh: vi.fn(),
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock global fetch to prevent network errors in CI
// Individual tests can override this mock as needed
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
} as Response)

// Mock window.location to prevent jsdom navigation errors
// This prevents "Not implemented: navigation (except hash changes)" errors
const mockLocation = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
}

Object.defineProperty(window, 'location', {
  writable: true,
  value: mockLocation,
})

// Prevent default navigation behavior on anchor clicks in tests
document.addEventListener('click', event => {
  const target = event.target as HTMLElement
  const anchor = target.closest('a')
  if (anchor && anchor.href && !anchor.href.startsWith('#')) {
    event.preventDefault()
  }
})

// Set default test environment variables to prevent API key errors
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-api-key-for-testing-only'
}
if (!process.env.FIREBASE_FUNCTION_URL) {
  process.env.FIREBASE_FUNCTION_URL = 'https://test-function-url.firebaseapp.com'
}
if (!process.env.FIREBASE_CLOUD_FUNCTION_URL) {
  process.env.FIREBASE_CLOUD_FUNCTION_URL = 'https://test-function-url.firebaseapp.com'
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
}
