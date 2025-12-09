import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollTracking } from '@/features/analytics/hooks/useScrollTracking'

// Mock the analytics function
vi.mock('@/lib/analytics', () => ({
  trackScrollDepth: vi.fn(),
}))

describe('useScrollTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set up scroll event listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useScrollTracking())

    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
      passive: true,
    })
    addEventListenerSpy.mockRestore()
  })

  it('should cleanup scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useScrollTracking())

    unmount()

    // Check that removeEventListener was called with 'scroll'
    const scrollCalls = removeEventListenerSpy.mock.calls.filter(call => call[0] === 'scroll')
    expect(scrollCalls.length).toBeGreaterThan(0)
    removeEventListenerSpy.mockRestore()
  })

  it('should initialize without errors', () => {
    expect(() => {
      renderHook(() => useScrollTracking())
    }).not.toThrow()
  })
})
