/**
 * Pricing plans for the Astro landing site.
 * Stripe payment links come from PUBLIC_STRIPE_PAYMENT_LINK_* env; fallback is login URL.
 */

export interface PricingPlan {
  id: string
  name: string
  price: number
  originalPrice?: number
  period: 'month' | 'year'
  description: string
  features: string[]
  popular?: boolean
  ctaText: string
  ctaVariant: 'primary' | 'secondary'
  ctaLink?: string
}

const APP_BASE = (
  import.meta.env.PUBLIC_APP_URL || 'https://app.aiworkoutgenerator.com'
).replace(/\/$/, '')
const FALLBACK_LOGIN_URL = `${APP_BASE}/login`

function getEnv(name: string): string {
  try {
    const v = import.meta.env[name]
    return typeof v === 'string' && v ? v : FALLBACK_LOGIN_URL
  } catch {
    return FALLBACK_LOGIN_URL
  }
}

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
    ctaLink: getEnv('PUBLIC_STRIPE_PAYMENT_LINK_BASIC'),
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
    ctaLink: getEnv('PUBLIC_STRIPE_PAYMENT_LINK_PRO'),
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
    ctaLink: getEnv('PUBLIC_STRIPE_PAYMENT_LINK_ELITE'),
  },
  {
    id: 'coach',
    name: 'Coach',
    price: 99,
    period: 'month',
    description: 'Hybrid coaching + live training',
    features: [
      '50 AI-generated workouts/month',
      'Full exercise library',
      'Daily check-in tracking',
      'Profile customization',
      'Calendar scheduling',
      'Workout history analytics',
      'Priority support',
      'Image generation',
      'Live online classes (3× weekly, currently 7am PST)',
      '1× 30-min coaching session/month (form check + program refinement)',
      '9 Coach-Certified Workouts/month',
      'Monthly program design + progression toward your goals',
      'Weekly Coach Office Hours (Q&A + substitutions)',
      '2 form check video reviews/month',
      'Travel / Busy Week workout options',
    ],
    ctaText: 'Work with a Coach',
    ctaVariant: 'secondary',
    ctaLink: getEnv('PUBLIC_STRIPE_PAYMENT_LINK_COACH'),
  },
  {
    id: 'coach-pro',
    name: 'Coach Pro',
    price: 199,
    period: 'month',
    description: 'High-touch coaching + nutrition',
    features: [
      '50 AI-generated workouts/month',
      'Full exercise library',
      'Daily check-in tracking',
      'Profile customization',
      'Calendar scheduling',
      'Workout history analytics',
      'Priority support',
      'Image generation',
      'Live online classes (3× weekly, currently 7am PST)',
      '2× 30-min coaching sessions/month',
      '12 Coach-Certified Workouts/month',
      'Monthly program design + progression',
      'Nutrition program design (templates + monthly adjustments)',
      'Priority messaging support (responses within 24h, business days)',
      'Weekly form check submissions',
      'Quarterly benchmarks + goal reset',
    ],
    ctaText: 'Get Coach Pro',
    ctaVariant: 'primary',
    ctaLink: getEnv('PUBLIC_STRIPE_PAYMENT_LINK_COACH_PRO'),
  },
]
