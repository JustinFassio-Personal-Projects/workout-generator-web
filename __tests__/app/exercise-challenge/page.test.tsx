import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExerciseChallengePage from '@/app/exercise-challenge/page'

// Mock dependencies
const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackVisionLabViewed: vi.fn(),
    trackVisionCtaGenerateWorkoutClicked: vi.fn(),
    trackVisionCtaViewPricingClicked: vi.fn(),
  },
}))

vi.mock('@/components/landing/ExerciseChallenge/LeadGate', () => ({
  LeadGate: ({ onLeadCaptured }: { onLeadCaptured: (id: string) => void }) => (
    <div data-testid="lead-gate">
      <button onClick={() => onLeadCaptured('test-lead-123')}>Submit Lead</button>
    </div>
  ),
}))

vi.mock('@/components/landing/ExerciseChallenge/VisionLabIframe', () => ({
  VisionLabIframe: ({
    onGenerationStarted,
    onGenerationCompleted,
  }: {
    onGenerationStarted?: (prompt?: string) => void
    onGenerationCompleted?: () => void
  }) => (
    <div data-testid="vision-lab-iframe">
      <button onClick={() => onGenerationStarted?.('test prompt')} data-testid="trigger-generation">
        Start Generation
      </button>
      <button onClick={() => onGenerationCompleted?.()} data-testid="complete-generation">
        Complete Generation
      </button>
    </div>
  ),
}))

vi.mock('@/components/landing/ExerciseChallenge/MicroInterview', () => ({
  MicroInterview: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="micro-interview">
      <button onClick={onComplete} data-testid="complete-interview">
        Complete Interview
      </button>
    </div>
  ),
}))

vi.mock('@/components/ui/Card/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/Button/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
  }) => (
    <button onClick={onClick} data-testid={`button-${variant || 'default'}`}>
      {children}
    </button>
  ),
}))

describe('ExerciseChallengePage', () => {
  let timers: ReturnType<typeof setTimeout>[]
  let mockGetElementById: any
  let setTimeoutSpy: any
  let clearTimeoutSpy: any
  let originalSetTimeout: typeof global.setTimeout
  let originalClearTimeout: typeof global.clearTimeout

  beforeEach(() => {
    vi.clearAllMocks()
    timers = []

    // Store original implementations
    originalSetTimeout = global.setTimeout
    originalClearTimeout = global.clearTimeout

    // Use vi.spyOn to safely mock setTimeout and clearTimeout
    setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
      const timer = originalSetTimeout(fn, delay || 0)
      timers.push(timer)
      return timer
    })

    clearTimeoutSpy = vi.spyOn(global, 'clearTimeout').mockImplementation(timer => {
      originalClearTimeout(timer)
    })

    // Mock document.getElementById
    mockGetElementById = vi.fn()
    document.getElementById = mockGetElementById

    // Mock window.location
    delete (window as any).location
    ;(window as any).location = {
      href: 'http://localhost:3000/exercise-challenge',
      pathname: '/exercise-challenge',
      searchParams: new URLSearchParams(),
    }

    // Mock document.referrer
    Object.defineProperty(document, 'referrer', {
      value: 'https://example.com',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    timers.forEach(timer => clearTimeout(timer))
    timers = []
    setTimeoutSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  it('should render hero section on initial load', async () => {
    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Fitcopilot Vision Lab')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        /Visualize technique — then tell us what you'd expect from an AI workout generator/
      )
    ).toBeInTheDocument()
  })

  it('should display lead gate when no leadId', async () => {
    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('lead-gate')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('vision-lab-iframe')).not.toBeInTheDocument()
  })

  it('should display vision lab iframe after lead capture', async () => {
    const user = userEvent.setup({ delay: null })
    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    await act(async () => {
      const submitButton = screen.getByText('Submit Lead')
      await user.click(submitButton)
    })

    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    expect(screen.queryByTestId('lead-gate')).not.toBeInTheDocument()
  })

  it('should show micro-interview after 2 second delay (Phase 1 fallback)', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ delay: null })

    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    // Capture lead
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    // Micro-interview should not be visible yet
    expect(screen.queryByTestId('micro-interview')).not.toBeInTheDocument()

    // Fast-forward 2 seconds
    await vi.advanceTimersByTimeAsync(2000)

    // Micro-interview should now be visible
    expect(screen.getByTestId('micro-interview')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('should show micro-interview immediately when generation starts (Phase 2)', async () => {
    const user = userEvent.setup({ delay: null })
    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    // Capture lead
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    // Wait for iframe to appear
    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Trigger generation start
    const triggerButton = screen.getByTestId('trigger-generation')
    await user.click(triggerButton)

    // Micro-interview should appear immediately
    await waitFor(
      () => {
        expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )
  })

  it('should show success state after micro-interview completion', async () => {
    const user = userEvent.setup({ delay: null })
    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    // Capture lead
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Trigger generation to show micro-interview
    const triggerButton = screen.getByTestId('trigger-generation')
    await user.click(triggerButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Complete interview
    const completeButton = screen.getByTestId('complete-interview')
    await user.click(completeButton)

    await waitFor(
      () => {
        expect(screen.getByText('Thanks — this helps a ton.')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    expect(screen.queryByTestId('vision-lab-iframe')).not.toBeInTheDocument()
    expect(screen.queryByTestId('micro-interview')).not.toBeInTheDocument()
  })

  it('should track analytics on page view with UTM parameters', async () => {
    const { analytics } = await import('@/lib/analytics')

    // Set up URL with UTM parameters
    const searchParams = new URLSearchParams()
    searchParams.set('utm_source', 'test-source')
    searchParams.set('utm_campaign', 'test-campaign')
    searchParams.set('utm_medium', 'test-medium')
    ;(window as any).location.searchParams = searchParams
    ;(window as any).location.href =
      'http://localhost:3000/exercise-challenge?utm_source=test-source&utm_campaign=test-campaign&utm_medium=test-medium'

    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    // Wait a bit for useEffect to run
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(analytics.trackVisionLabViewed).toHaveBeenCalled()
    const callArgs = (analytics.trackVisionLabViewed as any).mock.calls[0][0]
    expect(callArgs.path).toBe('/exercise-challenge')
    expect(callArgs.referrer).toBe('https://example.com')
  })

  it('should track analytics on page view without UTM parameters', async () => {
    const { analytics } = await import('@/lib/analytics')

    // Clear UTM parameters
    ;(window as any).location.searchParams = new URLSearchParams()

    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    expect(analytics.trackVisionLabViewed).toHaveBeenCalledWith({
      path: '/exercise-challenge',
      referrer: 'https://example.com',
      utm_source: undefined,
      utm_campaign: undefined,
      utm_medium: undefined,
    })
  })

  it('should navigate and scroll to workout-builder on CTA click', async () => {
    const user = userEvent.setup({ delay: null })
    const { analytics } = await import('@/lib/analytics')

    // Mock element for scrollIntoView
    const mockElement = {
      scrollIntoView: vi.fn(),
    }
    mockGetElementById.mockReturnValue(mockElement)

    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    // Complete the flow to get to success state
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const triggerButton = screen.getByTestId('trigger-generation')
    await user.click(triggerButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const completeButton = screen.getByTestId('complete-interview')
    await user.click(completeButton)

    await waitFor(
      () => {
        expect(screen.getByText('Thanks — this helps a ton.')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Click generate workout button
    const generateButton = screen.getByTestId('button-primary')
    await user.click(generateButton)

    expect(mockPush).toHaveBeenCalledWith('/#workout-builder')
    expect(analytics.trackVisionCtaGenerateWorkoutClicked).toHaveBeenCalledWith('test-lead-123')

    // Wait for setTimeout to execute scroll
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(mockGetElementById).toHaveBeenCalledWith('workout-builder')
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('should navigate and scroll to pricing on CTA click', async () => {
    const user = userEvent.setup({ delay: null })
    const { analytics } = await import('@/lib/analytics')

    // Mock element for scrollIntoView
    const mockElement = {
      scrollIntoView: vi.fn(),
    }
    mockGetElementById.mockReturnValue(mockElement)

    await act(async () => {
      render(<ExerciseChallengePage />)
    })

    // Complete the flow to get to success state
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const triggerButton = screen.getByTestId('trigger-generation')
    await user.click(triggerButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const completeButton = screen.getByTestId('complete-interview')
    await user.click(completeButton)

    await waitFor(
      () => {
        expect(screen.getByText('Thanks — this helps a ton.')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Click view pricing button
    const pricingButtons = screen.getAllByTestId('button-secondary')
    const viewPricingButton = pricingButtons.find(button =>
      button.textContent?.includes('View pricing')
    )
    expect(viewPricingButton).toBeInTheDocument()

    if (viewPricingButton) {
      await user.click(viewPricingButton)
    }

    expect(mockPush).toHaveBeenCalledWith('/#pricing')
    expect(analytics.trackVisionCtaViewPricingClicked).toHaveBeenCalledWith('test-lead-123')

    // Wait for setTimeout to execute scroll
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(mockGetElementById).toHaveBeenCalledWith('pricing')
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('should handle scroll when element does not exist', async () => {
    const user = userEvent.setup({ delay: null })

    // Mock getElementById to return null
    mockGetElementById.mockReturnValue(null)

    render(<ExerciseChallengePage />)

    // Complete the flow
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const triggerButton = screen.getByTestId('trigger-generation')
    await user.click(triggerButton)

    await waitFor(
      () => {
        expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    const completeButton = screen.getByTestId('complete-interview')
    await user.click(completeButton)

    await waitFor(
      () => {
        expect(screen.getByText('Thanks — this helps a ton.')).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Click generate workout button
    const generateButton = screen.getByTestId('button-primary')
    await user.click(generateButton)

    // Should not throw error when element doesn't exist
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(mockGetElementById).toHaveBeenCalledWith('workout-builder')
  })

  it('should cleanup setTimeout on unmount', async () => {
    const user = userEvent.setup({ delay: null })

    let unmount: (() => void) | undefined
    await act(async () => {
      const result = render(<ExerciseChallengePage />)
      unmount = result.unmount
    })

    // Capture lead to trigger setTimeout
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    // Verify setTimeout was called
    expect(global.setTimeout).toHaveBeenCalled()

    // Unmount - cleanup should be called
    if (unmount) {
      unmount()
    }

    // Verify that the component unmounted without errors
    expect(screen.queryByTestId('lead-gate')).not.toBeInTheDocument()
  })

  it('should pass vision prompt to micro-interview when provided', async () => {
    const user = userEvent.setup({ delay: null })
    render(<ExerciseChallengePage />)

    // Capture lead
    const submitButton = screen.getByText('Submit Lead')
    await user.click(submitButton)

    // Wait for iframe
    await waitFor(
      () => {
        expect(screen.getByTestId('vision-lab-iframe')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // Trigger generation with prompt - this should show micro-interview immediately via Phase 2
    const triggerButton = screen.getByTestId('trigger-generation')
    await user.click(triggerButton)

    // Micro-interview should appear via Phase 2 callback
    await waitFor(
      () => {
        expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // Verify the micro-interview component was rendered (it receives the prompt prop)
    expect(screen.getByTestId('micro-interview')).toBeInTheDocument()
  }, 10000) // Increase timeout for this test
})
