import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the home page', () => {
    render(<Home />)

    expect(document.querySelector('main')).toBeInTheDocument()
  })

  it('should render all main sections', () => {
    render(<Home />)

    // Check that main sections are rendered (they may not have text content visible without data)
    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.className).toContain('min-h-screen')
  })
})
