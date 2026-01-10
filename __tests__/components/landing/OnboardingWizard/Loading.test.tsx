import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import Loading from '@/components/landing/OnboardingWizard/Loading'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('OnboardingWizard Loading', () => {
  const defaultProps = {
    status: 'Analyzing Biomechanics...',
    step: 1,
    facts: [
      'The human body has over 600 muscles',
      'Exercise increases neuroplasticity',
      'Proper form prevents injuries',
      'Consistency beats intensity',
    ],
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render loading component', () => {
    render(<Loading {...defaultProps} />)
    expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()
  })

  it('should display status message', () => {
    render(<Loading {...defaultProps} status="Mapping Kinetic Chains..." />)
    expect(screen.getByText('Mapping Kinetic Chains...')).toBeInTheDocument()
  })

  it('should display facts when provided', () => {
    render(<Loading {...defaultProps} />)
    expect(screen.getByText('The human body has over 600 muscles')).toBeInTheDocument()
    expect(screen.getByText(/Biomechanical Logic Stream/i)).toBeInTheDocument()
  })

  it('should rotate through facts', async () => {
    render(<Loading {...defaultProps} />)

    // Initial fact should be displayed
    expect(screen.getByText('The human body has over 600 muscles')).toBeInTheDocument()

    // Advance time by 5 seconds to trigger interval
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Wait for fact rotation - the component updates after the interval
    await waitFor(
      () => {
        expect(screen.getByText('Exercise increases neuroplasticity')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('should handle empty facts array', () => {
    render(<Loading {...defaultProps} facts={[]} />)
    expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()
    expect(screen.getByText('Establishing connection...')).toBeInTheDocument()
  })

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = render(<Loading {...defaultProps} />)

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('should display different status for different steps', () => {
    const { rerender } = render(<Loading {...defaultProps} step={1} />)
    expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()

    rerender(<Loading {...defaultProps} status="Optimizing Technique..." step={3} />)
    expect(screen.getByText('Optimizing Technique...')).toBeInTheDocument()
  })

  it('should display progress bar with correct width', () => {
    const { container } = render(<Loading {...defaultProps} step={3} />)
    const progressBar = container.querySelector('[style*="width"]') as HTMLElement
    expect(progressBar).toBeInTheDocument()
    expect(progressBar?.style.width).toContain('%')
  })
})
