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

// Fallback URL for payment links if environment variables are not set
const FALLBACK_LOGIN_URL = 'https://aiworkoutgen.app/login'

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    description: 'Get started with AI workouts',
    features: [
      '5 AI-generated workouts (lifetime limit)',
      'Basic exercise library',
      'Daily check-in tracking',
      'Profile customization',
    ],
    ctaText: 'Get Started',
    ctaVariant: 'secondary',
    ctaLink: FALLBACK_LOGIN_URL,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 5.99,
    period: 'month',
    description: 'More workouts, monthly renewal',
    features: [
      '20 AI-generated workouts/month',
      'Basic exercise library',
      'Daily check-in tracking',
      'Profile customization',
    ],
    ctaText: 'Subscribe',
    ctaVariant: 'secondary',
    ctaLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC || FALLBACK_LOGIN_URL,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: 'month',
    description: 'Perfect for fitness enthusiasts',
    popular: true,
    features: [
      '50 AI-generated workouts/month',
      'Full exercise library',
      'Daily check-in tracking',
      'Profile customization',
      'Calendar scheduling',
      'Workout history analytics',
    ],
    ctaText: 'Get Pro',
    ctaVariant: 'primary',
    ctaLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO || FALLBACK_LOGIN_URL,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 49,
    period: 'month',
    description: 'For serious athletes',
    features: [
      'Unlimited AI-generated workouts',
      'Full exercise library',
      'Daily check-in tracking',
      'Profile customization',
      'Calendar scheduling',
      'Workout history analytics',
      'Priority support',
      'Coach access (coming soon)',
    ],
    ctaText: 'Go Elite',
    ctaVariant: 'secondary',
    ctaLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_ELITE || FALLBACK_LOGIN_URL,
  },
]
