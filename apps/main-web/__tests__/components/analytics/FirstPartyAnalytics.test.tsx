import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'

function setDoNotTrack(value: string | undefined) {
  Object.defineProperty(navigator, 'doNotTrack', {
    value,
    configurable: true,
  })
}

describe('FirstPartyAnalytics', () => {
  const originalSendBeacon = navigator.sendBeacon

  beforeEach(() => {
    vi.restoreAllMocks()
    ;(global.fetch as any) = vi.fn().mockResolvedValue({ ok: true })
    setDoNotTrack(undefined)
  })

  afterEach(() => {
    // restore
    ;(navigator as any).sendBeacon = originalSendBeacon
  })

  it('sends a page_view via sendBeacon on non-admin path', async () => {
    vi.resetModules()
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
      usePathname: () => '/onboard',
      useSearchParams: () => new URLSearchParams('utm_source=google'),
    }))

    const sendBeacon = vi.fn(() => true)
    ;(navigator as any).sendBeacon = sendBeacon

    const { FirstPartyAnalytics } = await import('@/components/analytics/FirstPartyAnalytics')
    render(<FirstPartyAnalytics />)

    expect(sendBeacon).toHaveBeenCalledWith('/api/analytics/collect', expect.any(Blob))
  })

  it('does not send events when Do Not Track is enabled', async () => {
    vi.resetModules()
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
      usePathname: () => '/onboard',
      useSearchParams: () => new URLSearchParams(),
    }))

    setDoNotTrack('1')

    const sendBeacon = vi.fn(() => true)
    ;(navigator as any).sendBeacon = sendBeacon

    const { FirstPartyAnalytics } = await import('@/components/analytics/FirstPartyAnalytics')
    render(<FirstPartyAnalytics />)

    expect(sendBeacon).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not send events on /admin routes', async () => {
    vi.resetModules()
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
      usePathname: () => '/admin',
      useSearchParams: () => new URLSearchParams(),
    }))

    const sendBeacon = vi.fn(() => true)
    ;(navigator as any).sendBeacon = sendBeacon

    const { FirstPartyAnalytics } = await import('@/components/analytics/FirstPartyAnalytics')
    render(<FirstPartyAnalytics />)

    expect(sendBeacon).not.toHaveBeenCalled()
  })

  it('sends an annotated click event', async () => {
    vi.resetModules()
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
      usePathname: () => '/onboard',
      useSearchParams: () => new URLSearchParams(),
    }))

    const sendBeacon = vi.fn(() => true)
    ;(navigator as any).sendBeacon = sendBeacon

    const { FirstPartyAnalytics } = await import('@/components/analytics/FirstPartyAnalytics')
    render(
      <>
        <FirstPartyAnalytics />
        <button data-analytics="test_click">Click me</button>
      </>
    )

    const btn = document.querySelector('button[data-analytics="test_click"]') as HTMLButtonElement
    btn.click()

    expect(sendBeacon).toHaveBeenCalled()
  })
})
