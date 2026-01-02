import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AOSInitializer } from '@/app/blog/AOSInitializer'

// Mock AOS
const mockAOS = {
  init: vi.fn(),
  refresh: vi.fn(),
}

vi.mock('aos', () => ({
  default: mockAOS,
}))

describe('AOSInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window flags
    delete (window as any).__AOS_CSS_LOADED__
  })

  it('should render without errors', () => {
    render(<AOSInitializer />)
    // Component renders null, so just check it doesn't throw
    expect(document.body).toBeInTheDocument()
  })
})
