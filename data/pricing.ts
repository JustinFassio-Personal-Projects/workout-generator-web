export interface PricingPlan {
  id: string
  name: string
  price: number
  period: 'month' | 'year'
  description: string
  features: string[]
  popular?: boolean
  ctaText: string
  ctaVariant: 'primary' | 'secondary'
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'Perfect for getting started with your fitness journey',
    features: [
      '5 workouts per month',
      'Basic exercise library',
      'Progress tracking',
      'Community access',
      'Mobile app access',
    ],
    ctaText: 'Get Started',
    ctaVariant: 'secondary',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: 'month',
    description: 'For serious fitness enthusiasts who want unlimited access',
    popular: true,
    features: [
      'Unlimited workouts',
      'Advanced AI generation',
      'Detailed analytics',
      'Priority support',
      'Custom workout plans',
      'Export workouts',
      'Early access to features',
    ],
    ctaText: 'Start Free Trial',
    ctaVariant: 'primary',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    period: 'month',
    description: 'For trainers and gyms managing multiple clients',
    features: [
      'Everything in Pro',
      'Team management',
      'Client progress tracking',
      'Bulk workout creation',
      'API access',
      'Custom branding',
      'Dedicated support',
      'Training resources',
    ],
    ctaText: 'Contact Sales',
    ctaVariant: 'secondary',
  },
]
