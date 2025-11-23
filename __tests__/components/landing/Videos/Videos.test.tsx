import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Videos } from '@/components/landing/Videos/Videos'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => {
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }
})

describe('Videos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render videos section', () => {
    render(<Videos />)
    const section = document.querySelector('section#videos')
    expect(section).toBeInTheDocument()
  })

  it('should render videos title', () => {
    render(<Videos />)
    expect(screen.getByText(/Get Your Custom/i)).toBeInTheDocument()
    expect(screen.getByText(/Workout Videos/i)).toBeInTheDocument()
  })

  it('should render videos subtitle', () => {
    render(<Videos />)
    expect(
      screen.getByText(/Submit your favorite workouts and our team will create custom videos/i)
    ).toBeInTheDocument()
  })

  it('should render CTA buttons', () => {
    render(<Videos />)
    expect(screen.getByText('Submit Your Workout')).toBeInTheDocument()
    expect(screen.getByText('View Pricing')).toBeInTheDocument()
  })

  it('should render CTA buttons with correct links', () => {
    render(<Videos />)
    const submitLink = screen.getByText('Submit Your Workout').closest('a')
    const pricingLink = screen.getByText('View Pricing').closest('a')
    expect(submitLink?.getAttribute('href')).toBe('#submit-workout')
    expect(pricingLink?.getAttribute('href')).toBe('#pricing')
  })

  it('should toggle category expansion on click', () => {
    render(<Videos />)
    // Find a category button (if categories have videos)
    const categoryButtons = document.querySelectorAll('button[aria-expanded]')
    if (categoryButtons.length > 0) {
      const firstButton = categoryButtons[0] as HTMLButtonElement
      const initialExpanded = firstButton.getAttribute('aria-expanded') === 'true'
      fireEvent.click(firstButton)
      const newExpanded = firstButton.getAttribute('aria-expanded') === 'true'
      expect(newExpanded).toBe(!initialExpanded)
    }
  })
})
