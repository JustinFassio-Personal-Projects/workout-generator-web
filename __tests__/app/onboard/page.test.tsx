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

  // Note: Dark mode is now applied by app/onboard/layout.tsx via inline script
  // The page component no longer manages dark mode - it's handled at the layout level
  // to prevent flash of light mode before React hydrates
})
