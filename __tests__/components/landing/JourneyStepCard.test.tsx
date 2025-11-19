import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JourneyStepCard } from '@/components/landing/Journey/JourneyStepCard'
import { Target } from 'lucide-react'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('JourneyStepCard', () => {
  const defaultProps = {
    number: 1,
    title: 'Test Step',
    description: 'Test description',
    icon: Target,
    features: ['Feature 1', 'Feature 2'],
    accentColor: '#84cc16',
    index: 0,
    isLast: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render journey step card', () => {
    render(<JourneyStepCard {...defaultProps} />)
    expect(screen.getByText('Test Step')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('should render step number', () => {
    render(<JourneyStepCard {...defaultProps} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('should render features when expanded', async () => {
    const user = userEvent.setup()
    render(<JourneyStepCard {...defaultProps} />)

    const card = screen.getByText('Test Step').closest('[class*="stepCard"]')
    expect(card).toBeInTheDocument()

    // Click to expand
    if (card) {
      await user.click(card)
    }

    expect(screen.getByText('Feature 1')).toBeInTheDocument()
    expect(screen.getByText('Feature 2')).toBeInTheDocument()
  })

  it('should toggle expansion on click', async () => {
    const user = userEvent.setup()
    render(<JourneyStepCard {...defaultProps} />)

    const card = screen.getByText('Test Step').closest('[class*="stepCard"]')
    expect(card).toBeInTheDocument()

    // Click to expand
    if (card) {
      await user.click(card)
      // After clicking, features should be visible
      expect(screen.getByText('Feature 1')).toBeInTheDocument()
      expect(screen.getByText('Feature 2')).toBeInTheDocument()
    }
  })

  it('should not render connector when isLast is true', () => {
    render(<JourneyStepCard {...defaultProps} isLast={true} />)
    const connector = document.querySelector('[class*="connector"]')
    expect(connector).not.toBeInTheDocument()
  })

  it('should render connector when isLast is false', () => {
    render(<JourneyStepCard {...defaultProps} isLast={false} />)
    const connector = document.querySelector('[class*="connector"]')
    expect(connector).toBeInTheDocument()
  })
})

