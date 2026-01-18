import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const mockCapture = vi.fn()
const mockIdentify = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: any[]) => mockCapture(...args),
    identify: (...args: any[]) => mockIdentify(...args),
  },
}))

const mockTrackUserLogin = vi.fn()
const mockTrackUserAccountCreated = vi.fn()
const mockTrackLoginIntent = vi.fn()
const mockTrackSignupIntent = vi.fn()
vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackUserLogin: (...args: any[]) => mockTrackUserLogin(...args),
    trackUserAccountCreated: (...args: any[]) => mockTrackUserAccountCreated(...args),
    trackLoginIntent: (...args: any[]) => mockTrackLoginIntent(...args),
    trackSignupIntent: (...args: any[]) => mockTrackSignupIntent(...args),
  },
}))

const mockEmitFlagToDOM = vi.fn()
const mockStoreFlagInLocalStorage = vi.fn()
vi.mock('@/lib/flagTracking', () => ({
  emitFlagToDOM: (...args: any[]) => mockEmitFlagToDOM(...args),
  storeFlagInLocalStorage: (...args: any[]) => mockStoreFlagInLocalStorage(...args),
}))

vi.mock('@/lib/flags', () => ({
  FLAG_NAMES: {
    USER_LOGGED_IN: 'USER_LOGGED_IN',
    USER_ACCOUNT_CREATED: 'USER_ACCOUNT_CREATED',
  },
}))

import { useAuthTracking } from '@/hooks/useAuthTracking'

describe('useAuthTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tracks login and sets flags', () => {
    const { result } = renderHook(() => useAuthTracking())

    act(() => {
      result.current.trackUserLogin({ source: 'test', method: 'email', location: 'hero' })
    })

    expect(mockEmitFlagToDOM).toHaveBeenCalledWith('USER_LOGGED_IN', true)
    expect(mockStoreFlagInLocalStorage).toHaveBeenCalledWith('USER_LOGGED_IN', true)
    expect(mockTrackUserLogin).toHaveBeenCalledWith({
      source: 'test',
      method: 'email',
      location: 'hero',
    })
  })

  it('tracks account creation (metadata-only signature) and captures PostHog event', () => {
    const { result } = renderHook(() => useAuthTracking())

    act(() => {
      result.current.trackUserAccountCreated({
        source: 'test',
        method: 'email',
        location: 'onboard',
      })
    })

    expect(mockEmitFlagToDOM).toHaveBeenCalledWith('USER_ACCOUNT_CREATED', true)
    expect(mockStoreFlagInLocalStorage).toHaveBeenCalledWith('USER_ACCOUNT_CREATED', true)
    expect(mockTrackUserAccountCreated).toHaveBeenCalled()
    expect(mockCapture).toHaveBeenCalledWith(
      'user_signed_up',
      expect.objectContaining({ signup_method: 'email' })
    )
    expect(mockIdentify).not.toHaveBeenCalled()
  })

  it('tracks account creation (userId + metadata) and identifies when userId is provided', () => {
    const { result } = renderHook(() => useAuthTracking())

    act(() => {
      result.current.trackUserAccountCreated('user-123', {
        source: 'test',
        method: 'oauth',
        location: 'signup',
        subscription_tier: 'pro',
        fitness_level: 'intermediate',
        signup_date: '2026-01-02',
      })
    })

    expect(mockCapture).toHaveBeenCalledWith(
      'user_signed_up',
      expect.objectContaining({ signup_method: 'oauth' })
    )
    expect(mockIdentify).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ subscription_tier: 'pro' })
    )
  })

  it('handles PostHog errors without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockCapture.mockImplementationOnce(() => {
      throw new Error('boom')
    })

    const { result } = renderHook(() => useAuthTracking())

    expect(() => {
      act(() => {
        result.current.trackUserAccountCreated({ method: 'email' })
      })
    }).not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith('PostHog tracking error:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('tracks login on mount when configured', async () => {
    renderHook(() => useAuthTracking({ trackOnMount: true, isAuthenticated: true }))

    await waitFor(() => {
      expect(mockTrackUserLogin).toHaveBeenCalledWith({ source: 'page_load', location: 'app' })
    })
  })

  it('tracks login/signup intent', () => {
    const { result } = renderHook(() => useAuthTracking())

    act(() => {
      result.current.trackLoginIntent('navbar', '/login')
      result.current.trackSignupIntent('hero', '/signup')
    })

    expect(mockTrackLoginIntent).toHaveBeenCalledWith('navbar', '/login')
    expect(mockTrackSignupIntent).toHaveBeenCalledWith('hero', '/signup')
  })
})
