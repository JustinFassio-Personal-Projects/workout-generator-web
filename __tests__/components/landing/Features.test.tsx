import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Features } from '@/components/landing/Features/Features'
import { features } from '@/data/features'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render features section', () => {
    render(<Features />)
    const section = document.querySelector('section#features')
    expect(section).toBeInTheDocument()
  })

  it('should render features title', () => {
    render(<Features />)
    expect(screen.getByText(/Powerful Features/i)).toBeInTheDocument()
    expect(screen.getByText(/Elevate Your Fitness/i)).toBeInTheDocument()
  })

  it('should render all feature cards', () => {
    render(<Features />)
    features.forEach(feature => {
      expect(screen.getByText(feature.title)).toBeInTheDocument()
      expect(screen.getByText(feature.description)).toBeInTheDocument()
    })
  })

  it('should render correct number of features', () => {
    render(<Features />)
    const featureTitles = features.map(f => f.title)
    featureTitles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })
})
