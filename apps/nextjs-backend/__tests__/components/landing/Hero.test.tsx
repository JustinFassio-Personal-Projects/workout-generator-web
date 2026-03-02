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
  analytics: {
    trackIntroStartBuilding: vi.fn(),
    trackIntroLearnMore: vi.fn(),
  },
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
    // Text is split across elements, so we check for each part
    expect(screen.getByText(/Stop Guessing\./i)).toBeInTheDocument()
    expect(screen.getByText(/Start Training\./i)).toBeInTheDocument()
    expect(screen.getByText(/The Science-Based AI Workout Generator/i)).toBeInTheDocument()
  })

  it('should render hero H2', () => {
    render(<Hero />)
    expect(screen.getByText(/Instantly build personalized/i)).toBeInTheDocument()
    expect(screen.getByText(/Hypertrophy & Strength/i)).toBeInTheDocument()
  })

  it('should render hero subtitle', () => {
    render(<Hero />)
    expect(screen.getByText(/Instantly build personalized/i)).toBeInTheDocument()
    expect(screen.getByText(/Closed-Loop Engine/i)).toBeInTheDocument()
  })

  it('should render CTA buttons', () => {
    render(<Hero />)
    expect(screen.getByRole('button', { name: /Build My Free Custom Plan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /See the Logic/i })).toBeInTheDocument()
  })

  it('should render stats', () => {
    render(<Hero />)
    expect(screen.getByText(/8,000\+/i)).toBeInTheDocument()
    expect(screen.getByText(/Athletes Optimized/i)).toBeInTheDocument()
    expect(screen.getByText(/15k\+/i)).toBeInTheDocument()
    expect(screen.getByText(/Plans Generated/i)).toBeInTheDocument()
    expect(screen.getByText(/4\.9\/5/i)).toBeInTheDocument()
    expect(screen.getByText(/TrustPilot Score/i)).toBeInTheDocument()
  })

  it('should call trackButtonClick when Build My Free Custom Plan button is clicked', () => {
    const { trackButtonClick } = analyticsModule
    render(<Hero />)

    const generateButton = screen.getByRole('button', { name: /Build My Free Custom Plan/i })
    fireEvent.click(generateButton)

    expect(trackButtonClick).toHaveBeenCalledWith('Build My Free Custom Plan', 'hero')
  })

  it('should call trackButtonClick and scroll to journey section when See the Logic button is clicked', () => {
    const { trackButtonClick } = analyticsModule

    // Mock getElementById and scrollIntoView
    const mockScrollIntoView = vi.fn()
    const mockElement = document.createElement('div')
    mockElement.scrollIntoView = mockScrollIntoView
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)

    render(<Hero />)

    const seeButton = screen.getByRole('button', { name: /See the Logic/i })
    fireEvent.click(seeButton)

    expect(trackButtonClick).toHaveBeenCalledWith('See the Logic', 'hero')
    expect(document.getElementById).toHaveBeenCalledWith('journey')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
