import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VisionLabIframe } from '@/components/landing/ExerciseChallenge/VisionLabIframe'
import * as analytics from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackVisionIframeLoaded: vi.fn(),
    trackVisionGenerationStarted: vi.fn(),
    trackVisionGenerationCompleted: vi.fn(),
  },
}))

describe('VisionLabIframe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any event listeners
    window.removeEventListener('message', () => {})
  })

  it('should render iframe and how it works section', () => {
    render(<VisionLabIframe leadId="lead-123" />)

    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText('Input exercise name')).toBeInTheDocument()
    expect(screen.getByText('Choose experience level')).toBeInTheDocument()
    expect(screen.getByTitle('Fitcopilot Vision Lab')).toBeInTheDocument()
  })

  it('should track iframe loaded on mount', () => {
    render(<VisionLabIframe leadId="lead-123" />)
    expect(analytics.analytics.trackVisionIframeLoaded).toHaveBeenCalledWith('lead-123')
  })

  it('should handle VISION_ANALYSIS_STARTED message', async () => {
    const onGenerationStarted = vi.fn()
    render(<VisionLabIframe leadId="lead-123" onGenerationStarted={onGenerationStarted} />)

    // Wait for component to set up message listener
    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionIframeLoaded).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Give a delay for listener setup
    await new Promise(resolve => setTimeout(resolve, 200))

    const message = {
      type: 'VISION_ANALYSIS_STARTED',
      prompt: 'test prompt',
    }

    // Create a proper MessageEvent
    const event = new MessageEvent('message', {
      data: message,
      origin: 'https://fitcopilot-677566904576.us-west1.run.app',
    })

    window.dispatchEvent(event)

    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionGenerationStarted).toHaveBeenCalledWith(
          'lead-123',
          11
        )
        expect(onGenerationStarted).toHaveBeenCalledWith('test prompt')
      },
      { timeout: 2000 }
    )
  })

  it('should handle VISION_ANALYSIS_COMPLETED message', async () => {
    const onGenerationCompleted = vi.fn()
    render(<VisionLabIframe leadId="lead-123" onGenerationCompleted={onGenerationCompleted} />)

    // Wait for component to set up message listener
    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionIframeLoaded).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Give a delay for listener setup
    await new Promise(resolve => setTimeout(resolve, 200))

    const message = {
      type: 'VISION_ANALYSIS_COMPLETED',
      prompt: 'test prompt',
      framework: 'test-framework',
      level: 'beginner',
    }

    // Create a proper MessageEvent
    const event = new MessageEvent('message', {
      data: message,
      origin: 'https://fitcopilot-677566904576.us-west1.run.app',
    })

    window.dispatchEvent(event)

    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionGenerationCompleted).toHaveBeenCalledWith('lead-123')
        expect(onGenerationCompleted).toHaveBeenCalled()
      },
      { timeout: 2000 }
    )
  })

  it('should ignore messages from wrong origin', async () => {
    const onGenerationStarted = vi.fn()
    render(<VisionLabIframe leadId="lead-123" onGenerationStarted={onGenerationStarted} />)

    // Wait for component to set up message listener
    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionIframeLoaded).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Give a delay for listener setup
    await new Promise(resolve => setTimeout(resolve, 200))

    const message = {
      type: 'VISION_ANALYSIS_STARTED',
      prompt: 'test prompt',
    }

    // Create a MessageEvent from wrong origin
    const event = new MessageEvent('message', {
      data: message,
      origin: 'https://evil.com',
    })

    window.dispatchEvent(event)

    // Wait a bit to ensure message was processed
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(onGenerationStarted).not.toHaveBeenCalled()
  })

  it('should ignore unknown message types', async () => {
    const onGenerationStarted = vi.fn()
    const onGenerationCompleted = vi.fn()
    render(
      <VisionLabIframe
        leadId="lead-123"
        onGenerationStarted={onGenerationStarted}
        onGenerationCompleted={onGenerationCompleted}
      />
    )

    // Wait for component to set up message listener
    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionIframeLoaded).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Give a delay for listener setup
    await new Promise(resolve => setTimeout(resolve, 200))

    const message = {
      type: 'UNKNOWN_TYPE',
      prompt: 'test prompt',
    }

    // Create a proper MessageEvent
    const event = new MessageEvent('message', {
      data: message,
      origin: 'https://fitcopilot-677566904576.us-west1.run.app',
    })

    window.dispatchEvent(event)

    // Wait a bit to ensure message was processed
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(onGenerationStarted).not.toHaveBeenCalled()
    expect(onGenerationCompleted).not.toHaveBeenCalled()
  })

  it('should render all 6 steps', () => {
    render(<VisionLabIframe leadId="lead-123" />)

    expect(screen.getByText('Input exercise name')).toBeInTheDocument()
    expect(screen.getByText('Choose experience level')).toBeInTheDocument()
    expect(screen.getByText('Select image style')).toBeInTheDocument()
    expect(screen.getByText('Submit exercise for imogen')).toBeInTheDocument()
    expect(screen.getByText('Review image')).toBeInTheDocument()
    expect(screen.getByText('Enhance or submit')).toBeInTheDocument()
  })

  it('should handle empty prompt in VISION_ANALYSIS_STARTED', async () => {
    const onGenerationStarted = vi.fn()
    render(<VisionLabIframe leadId="lead-123" onGenerationStarted={onGenerationStarted} />)

    // Wait for component to set up message listener
    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionIframeLoaded).toHaveBeenCalled()
      },
      { timeout: 1000 }
    )

    // Give a delay for listener setup
    await new Promise(resolve => setTimeout(resolve, 200))

    const message = {
      type: 'VISION_ANALYSIS_STARTED',
      prompt: '',
    }

    // Create a proper MessageEvent
    const event = new MessageEvent('message', {
      data: message,
      origin: 'https://fitcopilot-677566904576.us-west1.run.app',
    })

    window.dispatchEvent(event)

    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionGenerationStarted).toHaveBeenCalledWith('lead-123', 0)
        expect(onGenerationStarted).toHaveBeenCalledWith('')
      },
      { timeout: 2000 }
    )
  })
})
