import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseChallengeSection } from '@/components/landing/ExerciseChallenge/ExerciseChallengeSection'

// Mock dependencies
const mockTrackButtonClick = vi.fn()

vi.mock('@/lib/analytics', () => ({
  trackButtonClick: (...args: any[]) => mockTrackButtonClick(...args),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/Button/Button', () => ({
  Button: ({
    children,
    variant,
    size,
  }: {
    children: React.ReactNode
    variant?: string
    size?: string
  }) => (
    <button data-testid="cta-button" data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Card/Card', () => ({
  Card: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <div data-testid="card" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}))

describe('ExerciseChallengeSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render section with title and description', () => {
    render(<ExerciseChallengeSection />)

    expect(screen.getByText(/Help build the library/)).toBeInTheDocument()
    expect(screen.getByText(/Contribute exercises to our library/)).toBeInTheDocument()
  })

  it('should render CTA button', () => {
    render(<ExerciseChallengeSection />)

    const button = screen.getByTestId('cta-button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Submit an Exercise')
    expect(button).toHaveAttribute('data-variant', 'primary')
    expect(button).toHaveAttribute('data-size', 'lg')
  })

  it('should handle CTA click and track analytics', async () => {
    const user = userEvent.setup()
    render(<ExerciseChallengeSection />)

    const link = screen.getByRole('link', { name: /Submit an Exercise/i })
    await user.click(link)

    expect(mockTrackButtonClick).toHaveBeenCalledWith('Exercise Challenge CTA', 'homepage', {
      location: 'exercise_challenge_section',
    })
  })

  it('should navigate to exercise-challenge page', () => {
    render(<ExerciseChallengeSection />)

    const link = screen.getByRole('link', { name: /Submit an Exercise/i })
    expect(link).toHaveAttribute('href', '/exercise-challenge')
  })

  it('should render card with elevated variant', () => {
    render(<ExerciseChallengeSection />)

    const card = screen.getByTestId('card')
    expect(card).toHaveAttribute('data-variant', 'elevated')
  })
})
