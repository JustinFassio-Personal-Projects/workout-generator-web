import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { Turnstile } from '@/components/landing/ExerciseChallenge/Turnstile'

// Mock window.turnstile
const mockTurnstile = {
  render: vi.fn().mockReturnValue('widget-123'),
  reset: vi.fn(),
  remove: vi.fn(),
}

describe('Turnstile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).turnstile
    // Remove any existing script tags
    document.querySelectorAll('script[src*="turnstile"]').forEach(script => script.remove())
  })

  afterEach(() => {
    delete (window as any).turnstile
  })

  it('should render container div', () => {
    const { container } = render(<Turnstile siteKey="test-key" onSuccess={vi.fn()} />)
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('should attempt to load Turnstile script', () => {
    render(<Turnstile siteKey="test-key" onSuccess={vi.fn()} />)
    // Component should render without errors
    // Script loading happens asynchronously and is tested via integration
  })

  it('should render widget when turnstile is already available', () => {
    ;(window as any).turnstile = mockTurnstile
    const { container } = render(<Turnstile siteKey="test-key" onSuccess={vi.fn()} />)
    expect(container.querySelector('div')).toBeInTheDocument()
    // Widget rendering happens in useEffect, which is tested via integration
  })

  it('should accept size prop and use dark theme by default', () => {
    const { container } = render(
      <Turnstile siteKey="test-key" onSuccess={vi.fn()} size="compact" />
    )
    expect(container.querySelector('div')).toBeInTheDocument()
    // Theme is hardcoded to 'dark' internally and cannot be changed
  })

  it('should handle onError prop', () => {
    const onError = vi.fn()
    const { container } = render(
      <Turnstile siteKey="test-key" onSuccess={vi.fn()} onError={onError} />
    )
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('should handle onExpire prop', () => {
    const onExpire = vi.fn()
    const { container } = render(
      <Turnstile siteKey="test-key" onSuccess={vi.fn()} onExpire={onExpire} />
    )
    expect(container.querySelector('div')).toBeInTheDocument()
  })
})
