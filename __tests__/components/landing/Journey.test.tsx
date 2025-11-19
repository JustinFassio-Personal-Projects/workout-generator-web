import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Journey } from '@/components/landing/Journey/Journey'
import { journeySteps } from '@/data/journey'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('Journey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render journey section', () => {
    render(<Journey />)
    const section = document.querySelector('section#journey')
    expect(section).toBeInTheDocument()
  })

  it('should render journey title', () => {
    render(<Journey />)
    // Verify title is in the header section using heading role
    const title = screen.getByRole('heading', { level: 2 })
    expect(title).toHaveTextContent(/Your Fitness/i)
    expect(title).toHaveTextContent(/Journey Starts Here/i)
  })

  it('should render all journey steps', () => {
    render(<Journey />)
    journeySteps.forEach(step => {
      expect(screen.getByText(step.title)).toBeInTheDocument()
      expect(screen.getByText(step.description)).toBeInTheDocument()
    })
  })

  it('should render correct number of steps', () => {
    render(<Journey />)
    const stepTitles = journeySteps.map(s => s.title)
    stepTitles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })
})
