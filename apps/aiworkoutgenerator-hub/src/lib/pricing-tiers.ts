/**
 * Shared pricing tier configuration.
 * Used by both the pricing page and dashboard for consistent tier information.
 */

export type TierId = "free" | "basic" | "pro" | "elite" | "coach" | "coach_pro";

export interface BasePricingTier {
  id: TierId;
  name: string;
  price: number;
  description: string;
  features: string[];
}

export const PRICING_TIERS: readonly BasePricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Get started with AI workouts and AI Actions",
    features: [
      "5 AI-generated workouts (lifetime)",
      "10 AI Actions (lifetime) — edits, adds, swaps",
      "Basic exercise library",
      "Daily check-in tracking",
      "Profile customization",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: 5.99,
    description: "More workouts and AI Actions, monthly renewal",
    features: [
      "20 AI-generated workouts/month",
      "100 AI Actions/month — edits, adds, swaps",
      "Basic exercise library",
      "Daily check-in tracking",
      "Profile customization",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    description: "Perfect for fitness enthusiasts",
    features: [
      "50 AI-generated workouts/month",
      "500 AI Actions/month",
      "Full exercise library",
      "Daily check-in tracking",
      "Profile customization",
      "Calendar scheduling",
      "Workout history analytics",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: 49,
    description: "For serious athletes",
    features: [
      "50 AI-generated workouts/month",
      "1,000 AI Actions/month",
      "Full exercise library",
      "Daily check-in tracking",
      "Profile customization",
      "Calendar scheduling",
      "Workout history analytics",
      "Priority support",
      "Community coach Q&A",
    ],
  },
  {
    id: "coach",
    name: "Coach",
    price: 99,
    description: "Hybrid coaching + live training",
    features: [
      "50 AI-generated workouts/month",
      "Unlimited AI Actions",
      "Full exercise library",
      "Daily check-in tracking",
      "Profile customization",
      "Calendar scheduling",
      "Workout history analytics",
      "Priority support",
      "Live online classes (3× weekly, currently 7am PST)",
      "1× 30-min coaching session/month (form check + program refinement)",
      "9 Coach-Certified Workouts/month",
      "Monthly program design + progression toward your goals",
      "Weekly Coach Office Hours (Q&A + substitutions)",
      "2 form check video reviews/month",
      "Travel / Busy Week workout options",
    ],
  },
  {
    id: "coach_pro",
    name: "Coach Pro",
    price: 199,
    description: "High-touch coaching + nutrition",
    features: [
      "50 AI-generated workouts/month",
      "Unlimited AI Actions",
      "Full exercise library",
      "Daily check-in tracking",
      "Profile customization",
      "Calendar scheduling",
      "Workout history analytics",
      "Priority support",
      "Live online classes (3× weekly, currently 7am PST)",
      "2× 30-min coaching sessions/month",
      "12 Coach-Certified Workouts/month",
      "Monthly program design + progression",
      "Nutrition program design (templates + monthly adjustments)",
      "Priority messaging support (responses within 24h, business days)",
      "Weekly form check submissions",
      "Quarterly benchmarks + goal reset",
    ],
  },
] as const;
