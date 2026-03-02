import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

// Mock dependencies
vi.mock('@/features/analytics/hooks/useScrollTracking', () => ({
  useScrollTracking: vi.fn(),
}))

vi.mock('@/components/landing/Hero/Hero', () => ({
  Hero: () => <div data-testid="hero">Hero</div>,
}))

vi.mock('@/components/landing/FAQ/FAQ', () => ({
  FAQ: () => <div data-testid="faq">FAQ</div>,
}))

vi.mock('@/components/landing/WorkoutPlanBuilder/WorkoutPlanBuilder', () => ({
  WorkoutPlanBuilder: () => <div data-testid="workout-plan-builder">WorkoutPlanBuilder</div>,
}))

vi.mock('@/components/landing/Features/Features', () => ({
  Features: () => <div data-testid="features">Features</div>,
}))

vi.mock('@/components/landing/ExerciseChallenge/ExerciseChallengeSection', () => ({
  ExerciseChallengeSection: () => (
    <div data-testid="exercise-challenge-section">ExerciseChallengeSection</div>
  ),
}))

vi.mock('@/components/landing/Journey/Journey', () => ({
  Journey: () => <div data-testid="journey">Journey</div>,
}))

vi.mock('@/components/landing/Testimonials/Testimonials', () => ({
  Testimonials: () => <div data-testid="testimonials">Testimonials</div>,
}))

vi.mock('@/components/landing/Videos/Videos', () => ({
  Videos: () => <div data-testid="videos">Videos</div>,
}))

vi.mock('@/components/landing/Blog/Blog', () => ({
  Blog: () => <div data-testid="blog">Blog</div>,
}))

vi.mock('@/components/landing/Bio/Bio', () => ({
  Bio: () => <div data-testid="bio">Bio</div>,
}))

vi.mock('@/components/landing/Pricing/Pricing', () => ({
  Pricing: () => <div data-testid="pricing">Pricing</div>,
}))

vi.mock('@/components/landing/Footer/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

vi.mock('@/components/landing/ScienceChart/ScienceChart', () => ({
  ScienceChart: () => <div data-testid="science-chart">ScienceChart</div>,
}))

vi.mock('@/components/landing/EquipmentAdaptive/EquipmentAdaptive', () => ({
  EquipmentAdaptive: () => <div data-testid="equipment-adaptive">EquipmentAdaptive</div>,
}))

vi.mock('@/data/faq', () => ({
  faqItems: [
    { question: 'Test Question 1', answer: 'Test Answer 1' },
    { question: 'Test Question 2', answer: 'Test Answer 2' },
  ],
}))

// Mock AOS module - simplified
const mockInit = vi.fn()
const mockRefresh = vi.fn()

vi.mock('aos', () => ({
  default: {
    init: mockInit,
    refresh: mockRefresh,
  },
}))

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInit.mockClear()
    mockRefresh.mockClear()

    // Reset window flags
    delete (global.window as any).__AOS_CSS_LOADED__
  })

  it('should render all landing page sections', () => {
    render(<Home />)

    expect(screen.getByTestId('hero')).toBeInTheDocument()
    expect(screen.getByTestId('faq')).toBeInTheDocument()
    expect(screen.getByTestId('workout-plan-builder')).toBeInTheDocument()
    expect(screen.getByTestId('features')).toBeInTheDocument()
    expect(screen.getByTestId('exercise-challenge-section')).toBeInTheDocument()
    expect(screen.getByTestId('journey')).toBeInTheDocument()
    expect(screen.getByTestId('testimonials')).toBeInTheDocument()
    expect(screen.getByTestId('videos')).toBeInTheDocument()
    expect(screen.getByTestId('blog')).toBeInTheDocument()
    expect(screen.getByTestId('bio')).toBeInTheDocument()
    expect(screen.getByTestId('pricing')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('should render structured data (JSON-LD) scripts', () => {
    const { container } = render(<Home />)

    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBe(3)

    // Verify homepage schema
    const homepageScript = Array.from(scripts).find(script =>
      script.textContent?.includes('WebPage')
    )
    expect(homepageScript).toBeTruthy()
    if (homepageScript) {
      expect(homepageScript.textContent).toContain('Workout Generator')
    }

    // Verify breadcrumb schema
    const breadcrumbScript = Array.from(scripts).find(script =>
      script.textContent?.includes('BreadcrumbList')
    )
    expect(breadcrumbScript).toBeTruthy()

    // Verify FAQ schema
    const faqScript = Array.from(scripts).find(script => script.textContent?.includes('FAQPage'))
    expect(faqScript).toBeTruthy()
    if (faqScript) {
      expect(faqScript.textContent).toContain('Test Question 1')
    }
  })

  it('should initialize AOS when CSS is already loaded', async () => {
    ;(global.window as any).__AOS_CSS_LOADED__ = true

    render(<Home />)

    // Wait a bit for AOS to initialize
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockInit).toHaveBeenCalledWith({
      duration: 800,
      easing: 'ease-out',
      once: true,
      offset: 100,
    })
  })

  it('should cleanup AOS on unmount', async () => {
    ;(global.window as any).__AOS_CSS_LOADED__ = true

    const { unmount } = render(<Home />)

    // Wait for AOS to initialize
    await new Promise(resolve => setTimeout(resolve, 100))

    unmount()

    // Verify refresh was called during cleanup
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should render main element with correct className', () => {
    const { container } = render(<Home />)

    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.className).toContain('min-h-screen')
  })

  it('should include homepage schema with correct structure', () => {
    const { container } = render(<Home />)

    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    const homepageScript = Array.from(scripts).find(script =>
      script.textContent?.includes('WebPage')
    )

    expect(homepageScript).toBeTruthy()
    if (homepageScript) {
      const content = JSON.parse(homepageScript.textContent || '{}')
      expect(content['@type']).toBe('WebPage')
      expect(content.name).toBe('Workout Generator - Trainer-Built Fitness Plans')
    }
  })

  it('should include breadcrumb schema', () => {
    const { container } = render(<Home />)

    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    const breadcrumbScript = Array.from(scripts).find(script =>
      script.textContent?.includes('BreadcrumbList')
    )

    expect(breadcrumbScript).toBeTruthy()
    if (breadcrumbScript) {
      const content = JSON.parse(breadcrumbScript.textContent || '{}')
      expect(content['@type']).toBe('BreadcrumbList')
    }
  })

  it('should include FAQ schema with test questions', () => {
    const { container } = render(<Home />)

    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    const faqScript = Array.from(scripts).find(script => script.textContent?.includes('FAQPage'))

    expect(faqScript).toBeTruthy()
    if (faqScript) {
      const content = JSON.parse(faqScript.textContent || '{}')
      expect(content['@type']).toBe('FAQPage')
      expect(content.mainEntity).toHaveLength(2)
      expect(content.mainEntity[0].name).toBe('Test Question 1')
    }
  })
})
