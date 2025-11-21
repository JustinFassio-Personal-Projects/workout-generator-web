import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '@/components/landing/Hero/Hero'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
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
    expect(screen.getByRole('button', { name: /Watch Demo/i })).toBeInTheDocument()
  })

  it('should render stats card', () => {
    render(<Hero />)
    expect(screen.getByText(/8K\+/i)).toBeInTheDocument()
    expect(screen.getByText(/Users/i)).toBeInTheDocument()
    expect(screen.getByText(/50K\+/i)).toBeInTheDocument()
    expect(screen.getByText(/Workouts Generated/i)).toBeInTheDocument()
  })
})
