import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PricingCard } from '@/components/landing/Pricing/PricingCard'
import { PricingPlan } from '@/data/pricing'
import * as analyticsModule from '@/lib/analytics'

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackVercelEvent: vi.fn(),
  analytics: {
    trackLoginIntent: vi.fn(),
    trackSignupIntent: vi.fn(),
  },
}))

describe('PricingCard', () => {
  const mockPlan: PricingPlan = {
    id: 'test',
    name: 'Test Plan',
    price: 10,
    period: 'month',
    description: 'Test description',
    features: ['Feature 1', 'Feature 2'],
    popular: false,
    ctaText: 'Get Started',
    ctaVariant: 'primary',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pricing card with plan details', () => {
    render(<PricingCard plan={mockPlan} index={0} />)

    expect(screen.getByText('Test Plan')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('$10')).toBeInTheDocument()
    expect(screen.getByText('/month')).toBeInTheDocument()
    expect(screen.getByText('Feature 1')).toBeInTheDocument()
    expect(screen.getByText('Feature 2')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('should display popular badge when plan is popular', () => {
    const popularPlan = { ...mockPlan, popular: true }
    render(<PricingCard plan={popularPlan} index={0} />)

    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('should display original price when provided', () => {
    const planWithOriginalPrice = { ...mockPlan, originalPrice: 20 }
    render(<PricingCard plan={planWithOriginalPrice} index={0} />)

    expect(screen.getByText('$20')).toBeInTheDocument()
  })

  it('should call trackVercelEvent when CTA button with link is clicked', () => {
    const { trackVercelEvent } = analyticsModule
    const planWithLink = { ...mockPlan, ctaLink: 'https://example.com' }
    render(<PricingCard plan={planWithLink} index={0} />)

    const ctaButton = screen.getByText('Get Started')
    fireEvent.click(ctaButton)

    expect(trackVercelEvent).toHaveBeenCalledWith('Pricing Plan Click', {
      plan_name: 'Test Plan',
      plan_price: 10,
      plan_period: 'month',
      location: 'pricing',
      is_login_link: false,
      is_signup_link: false,
    })
  })

  it('should call trackVercelEvent when CTA button without link is clicked', () => {
    const { trackVercelEvent } = analyticsModule
    render(<PricingCard plan={mockPlan} index={0} />)

    const ctaButton = screen.getByText('Get Started')
    fireEvent.click(ctaButton)

    expect(trackVercelEvent).toHaveBeenCalledWith('Pricing Plan Click', {
      plan_name: 'Test Plan',
      plan_price: 10,
      plan_period: 'month',
      location: 'pricing',
      is_login_link: false,
      is_signup_link: false,
    })
  })
})
