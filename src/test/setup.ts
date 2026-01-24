import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import React from 'react'

// Enable React act() environment for React 18/19 warnings
globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

// Mock HTMLCanvasElement for Chart.js components
// jsdom doesn't implement canvas APIs, so we provide minimal mocks
HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      canvas: document.createElement('canvas'),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createPattern: vi.fn(),
      clip: vi.fn(),
      isPointInPath: vi.fn(() => false),
    } as any
  }
  return null
})

// Mock canvas dimensions
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  writable: true,
  value: 200,
})
Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  writable: true,
  value: 200,
})

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
if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'
}
if (!process.env.NEXT_PUBLIC_POSTHOG_HOST) {
  process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com'
}
