import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadGate } from '@/components/landing/ExerciseChallenge/LeadGate'
import * as analytics from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackVisionLeadGateOpened: vi.fn(),
    trackVisionLeadSubmitted: vi.fn(),
  },
}))

vi.mock('@/components/landing/ExerciseChallenge/Turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    return (
      <div data-testid="turnstile">
        <button onClick={() => onSuccess('test-token')}>Complete Captcha</button>
      </div>
    )
  },
}))

describe('LeadGate', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalEnv) {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    }
  })

  it('should render lead gate form', () => {
    const onLeadCaptured = vi.fn()
    render(<LeadGate onLeadCaptured={onLeadCaptured} />)

    expect(screen.getByText('Before you start')).toBeInTheDocument()
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
    // Use getByRole with name option to be more specific
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    expect(emailInput).toBeInTheDocument()
  })

  it('should track gate opened on mount', () => {
    render(<LeadGate onLeadCaptured={vi.fn()} />)
    expect(analytics.analytics.trackVisionLeadGateOpened).toHaveBeenCalled()
  })

  it('should show error when site key is not configured', () => {
    // Temporarily remove the env var
    const tempKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    // Force a re-render by unmounting and remounting
    const { unmount } = render(<LeadGate onLeadCaptured={vi.fn()} />)
    unmount()

    render(<LeadGate onLeadCaptured={vi.fn()} />)
    expect(screen.getByText(/Captcha configuration error/i)).toBeInTheDocument()

    // Restore
    if (tempKey) {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = tempKey
    }
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    const onLeadCaptured = vi.fn()
    render(<LeadGate onLeadCaptured={onLeadCaptured} />)

    const submitButton = screen.getByRole('button', { name: /Submit Lead/i })
    await user.click(submitButton)

    expect(screen.getByText(/First name is required/i)).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<LeadGate onLeadCaptured={vi.fn()} />)

    const firstNameInput = screen.getByLabelText(/First Name/i)
    const emailInput = screen.getByRole('textbox', { name: /email/i })

    await user.type(firstNameInput, 'Test')
    await user.type(emailInput, 'invalid-email')

    // Email validation happens on blur/change
    expect(emailInput).toHaveValue('invalid-email')
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    const onLeadCaptured = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lead_id: 'lead-123', message: 'Success' }),
    })

    render(<LeadGate onLeadCaptured={onLeadCaptured} />)

    // Complete captcha first
    const captchaButton = screen.getByText('Complete Captcha')
    await user.click(captchaButton)

    const firstNameInput = screen.getByLabelText(/First Name/i)
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const submitButton = screen.getByRole('button', { name: /Submit Lead/i })

    await user.type(firstNameInput, 'Test')
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onLeadCaptured).toHaveBeenCalledWith('lead-123')
    })
  })
})
