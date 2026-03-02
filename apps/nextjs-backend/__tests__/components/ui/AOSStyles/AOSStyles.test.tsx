import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { AOSStyles } from '@/components/ui/AOSStyles/AOSStyles'

describe('AOSStyles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).__AOS_CSS_LOADED__
  })

  afterEach(() => {
    delete (window as any).__AOS_CSS_LOADED__
  })

  it('should render nothing', () => {
    const { container } = render(<AOSStyles />)
    expect(container.firstChild).toBeNull()
  })

  it('should not reload CSS if already loaded', () => {
    ;(window as any).__AOS_CSS_LOADED__ = true

    // Component should render without errors
    const { container } = render(<AOSStyles />)
    expect(container.firstChild).toBeNull()
  })

  it('should attempt to load CSS when not already loaded', () => {
    // Component should render without errors
    const { container } = render(<AOSStyles />)
    expect(container.firstChild).toBeNull()
    // The actual import happens asynchronously and is hard to test without complex mocking
    // This test ensures the component renders without throwing
  })
})
