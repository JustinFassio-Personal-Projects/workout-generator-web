import { getAppBaseUrl } from '@/lib/buildSignupUrl'

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
  ctaLink?: string
}

// Fallback URL for Pro/Elite (and other tiers) when env vars are not set. Premium uses its own default link below.
const FALLBACK_LOGIN_URL = `${getAppBaseUrl()}/login`
// Premium $11.99 default payment link. Used when env unset only in production; outside production we fall back to login URL to avoid accidental live checkout.
const DEFAULT_PREMIUM_PAYMENT_LINK = 'https://buy.stripe.com/dRm6oHcW3gW19RZ6qlgnK00'

function getPremiumCtaLink(): string {
  const v = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM
  if (v) return v
  return process.env.NODE_ENV === 'production' ? DEFAULT_PREMIUM_PAYMENT_LINK : FALLBACK_LOGIN_URL
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'premium',
    name: 'Premium',
    price: 11.99,
    period: 'month',
    description: 'Entry tier, monthly renewal',
    features: [
      '20 AI-generated workouts/month',
      'Basic exercise library',
      'Daily check-in tracking',
      'Profile customization',
    ],
    ctaText: 'Subscribe',
    ctaVariant: 'secondary',
    ctaLink: getPremiumCtaLink(),
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
