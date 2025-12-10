import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Hero } from '@/components/landing/Hero/Hero'
import * as analyticsModule from '@/lib/analytics'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackButtonClick: vi.fn(),
}))

describe('Hero', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render hero section', () => {
    render(<Hero />)
    const section = document.querySelector('section#hero')
    expect(section).toBeInTheDocument()
  })

  it('should render hero title', () => {
    render(<Hero />)
    expect(screen.getByText(/Transform Your Fitness Journey/i)).toBeInTheDocument()
    expect(screen.getByText(/AI-Powered Workouts/i)).toBeInTheDocument()
  })

  it('should render hero subtitle', () => {
    render(<Hero />)
    expect(screen.getByText(/Generate personalized workout plans/i)).toBeInTheDocument()
  })

  it('should render CTA buttons', () => {
    render(<Hero />)
    expect(screen.getByRole('button', { name: /Get Started Free/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Watch Videos/i })).toBeInTheDocument()
  })

  it('should render stats card', () => {
    render(<Hero />)
    expect(screen.getByText(/8K\+/i)).toBeInTheDocument()
    expect(screen.getByText(/Users/i)).toBeInTheDocument()
    expect(screen.getByText(/50K\+/i)).toBeInTheDocument()
    expect(screen.getByText(/Workouts Generated/i)).toBeInTheDocument()
  })

  it('should call trackButtonClick when Get Started Free button is clicked', () => {
    const { trackButtonClick } = analyticsModule
    render(<Hero />)

    const getStartedButton = screen.getByRole('button', { name: /Get Started Free/i })
    fireEvent.click(getStartedButton)

    expect(trackButtonClick).toHaveBeenCalledWith('Get Started Free', 'hero')
  })

  it('should call trackButtonClick and scroll to videos section when Watch Videos button is clicked', () => {
    const { trackButtonClick } = analyticsModule

    // Mock getElementById and scrollIntoView
    const mockScrollIntoView = vi.fn()
    const mockElement = {
      scrollIntoView: mockScrollIntoView,
    }
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as HTMLElement)

    render(<Hero />)

    const watchVideosButton = screen.getByRole('button', { name: /Watch Videos/i })
    fireEvent.click(watchVideosButton)

    expect(trackButtonClick).toHaveBeenCalledWith('Watch Videos', 'hero')
    expect(document.getElementById).toHaveBeenCalledWith('videos')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
