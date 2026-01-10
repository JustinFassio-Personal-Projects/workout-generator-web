import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardPage from '@/app/onboard/page'

// Mock OnboardingWizard
vi.mock('@/components/landing/OnboardingWizard/OnboardingWizard', () => ({
  OnboardingWizard: () => <div>OnboardingWizard</div>,
}))

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('OnboardPage', () => {
  let originalClassList: DOMTokenList

  beforeEach(() => {
    originalClassList = document.documentElement.classList
    document.documentElement.classList.remove('dark')
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original classList state
    if (originalClassList.contains('dark')) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  })

  it('should render OnboardingWizard component', () => {
    render(<OnboardPage />)
    expect(screen.getByText('OnboardingWizard')).toBeInTheDocument()
  })

  it('should force dark mode on mount', () => {
    render(<OnboardPage />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should restore original dark mode state on unmount when it was not dark', () => {
    document.documentElement.classList.remove('dark')
    const { unmount } = render(<OnboardPage />)

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    unmount()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should keep dark mode on unmount if it was already dark', () => {
    document.documentElement.classList.add('dark')
    const { unmount } = render(<OnboardPage />)

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    unmount()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
