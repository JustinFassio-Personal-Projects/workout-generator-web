export interface PricingPlan {
  id: string
  name: string
  price: number
  originalPrice?: number // For strike-through pricing during beta
  period: 'month' | 'year'
  description: string
  features: string[]
  popular?: boolean
  ctaText: string
  ctaVariant: 'primary' | 'secondary'
  ctaLink?: string // Optional link for CTA button
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
      'Progress tracking (coming soon)',
      'Community access (coming soon)',
      'Mobile Friendly',
    ],
    ctaText: 'Get Started',
    ctaVariant: 'secondary',
    ctaLink: 'https://members.fitcopilot.ai/conversion',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 10, // Beta pricing
    originalPrice: 20, // Regular price (shown with strike-through)
    period: 'month',
    description: 'For serious fitness enthusiasts who want unlimited access',
    popular: true,
    features: [
      'Fully personalized workouts',
      'Advanced AI generation',
      'Detailed analytics (coming soon)',
      'Priority support',
      'Custom workout plans',
      'Export workouts',
      'Early access to features',
    ],
    ctaText: 'Start Free Trial',
    ctaVariant: 'primary',
    ctaLink: 'https://members.fitcopilot.ai/conversion',
  },
  // Enterprise plan commented out during beta
  // {
  //   id: 'enterprise',
  //   name: 'Enterprise',
  //   price: 49,
  //   period: 'month',
  //   description: 'For trainers and gyms managing multiple clients',
  //   features: [
  //     'Everything in Pro',
  //     'Team management',
  //     'Client progress tracking',
  //     'Bulk workout creation',
  //     'API access',
  //     'Custom branding',
  //     'Dedicated support',
  //     'Training resources',
  //   ],
  //   ctaText: 'Contact Sales',
  //   ctaVariant: 'secondary',
  // },
]
