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
    // Mock window.alert
    global.alert = vi.fn()
  })

  it('should render hero section', () => {
    render(<Hero />)
    const section = document.querySelector('section#hero')
    expect(section).toBeInTheDocument()
  })

  it('should render hero title', () => {
    render(<Hero />)
    expect(
      screen.getByText(/AI Workout Generator for Personalized Strength & Conditioning/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Built by Certified Trainers/i)).toBeInTheDocument()
  })

  it('should render hero H2', () => {
    render(<Hero />)
    expect(
      screen.getByText(
        /Smart, safe workout plans powered by adaptive AI — grounded in real coaching experience/i
      )
    ).toBeInTheDocument()
  })

  it('should render hero subtitle', () => {
    render(<Hero />)
    expect(
      screen.getByText(/Create adaptive workout plans that evolve with your progress/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/based on real training principles, not random AI guesses/i)
    ).toBeInTheDocument()
  })

  it('should render CTA buttons', () => {
    render(<Hero />)
    expect(screen.getByRole('button', { name: /Generate My AI Workout/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Watch How It Works/i })).toBeInTheDocument()
  })

  it('should render stats', () => {
    render(<Hero />)
    expect(screen.getByText(/Trained over 8,000\+ athletes/i)).toBeInTheDocument()
    expect(screen.getByText(/15,000\+ workouts generated/i)).toBeInTheDocument()
    expect(screen.getByText(/4\.9★ average rating/i)).toBeInTheDocument()
  })

  it('should call trackButtonClick when Generate My AI Workout button is clicked', () => {
    const { trackButtonClick } = analyticsModule
    render(<Hero />)

    const generateButton = screen.getByRole('button', { name: /Generate My AI Workout/i })
    fireEvent.click(generateButton)

    expect(trackButtonClick).toHaveBeenCalledWith('Generate My AI Workout', 'hero')
  })

  it('should call trackButtonClick and scroll to videos section when Watch How It Works button is clicked', () => {
    const { trackButtonClick } = analyticsModule

    // Mock getElementById and scrollIntoView
    const mockScrollIntoView = vi.fn()
    const mockElement = document.createElement('div')
    mockElement.scrollIntoView = mockScrollIntoView
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)

    render(<Hero />)

    const watchButton = screen.getByRole('button', { name: /Watch How It Works/i })
    fireEvent.click(watchButton)

    expect(trackButtonClick).toHaveBeenCalledWith('Watch How It Works', 'hero')
    expect(document.getElementById).toHaveBeenCalledWith('videos')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
