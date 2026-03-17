"use client";

import { useMemo } from "react";
import type { User } from "firebase/auth";
import { Check } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  UserCog,
  Sparkles,
  Users,
  Dumbbell,
  Target,
  Image,
  History,
  Infinity,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useSubscription } from "@/hooks/useSubscription";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TierId } from "@/lib/pricing-tiers";

interface FeatureFAQSectionProps {
  user: User | null;
}

interface Feature {
  id: string;
  title: string;
  icon: LucideIcon;
  tier: TierId;
  description: string;
  howToUse: string;
}

// Accurate feature list based on codebase audit
const FEATURES: Feature[] = [
  // FREE TIER (Available to All)
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    tier: "free",
    description:
      "Your central hub for managing your fitness journey. Quick access to daily check-ins, workout generation, and your recent activity at a glance.",
    howToUse:
      "After logging in, you'll land on your Dashboard. Use the action cards to navigate to Daily Check-In, Generate Workout, or edit your Profile. Your recent workouts appear at the bottom.",
  },
  {
    id: "daily-checkin",
    title: "Daily Check-In",
    icon: CalendarCheck,
    tier: "free",
    description:
      "Log how you're feeling before each workout so your AI trainer can adjust intensity and exercise selection based on your current state.",
    howToUse:
      "Rate your energy level, sleep quality, stress, and muscle soreness using the sliders. Complete this before generating a workout for the best personalization. Find it: Dashboard → Daily Check-In.",
  },
  {
    id: "profile",
    title: "Profile & Personalization",
    icon: UserCog,
    tier: "free",
    description:
      "Set your body stats, fitness goals, any injuries or limitations, and training preferences. This data shapes every workout you generate.",
    howToUse:
      "Navigate to Profile from the Dashboard. Fill in your measurements, select your primary fitness goals, note any injuries, and set your preferred workout duration. Your AI trainers reference this for every workout.",
  },
  {
    id: "workout-generation",
    title: "Workout Generation",
    icon: Sparkles,
    tier: "free",
    description:
      "AI creates personalized workouts tailored to your profile, daily check-in, and selected trainer. Free tier includes 5 lifetime workouts to get you started.",
    howToUse:
      "Go to Generate Workout, select an AI trainer, set duration and equipment, then hit Generate. Your workout appears with exercises, sets, reps, and rest times.",
  },
  {
    id: "ai-trainers",
    title: "AI Trainers",
    icon: Users,
    tier: "free",
    description:
      "Choose from 6 specialized AI trainers, each with unique coaching styles: strength training, cardio/HIIT, yoga/mobility, bodyweight, Pilates, and CrossFit-style workouts.",
    howToUse:
      "On the Generate page, browse trainer cards to see their specialty and philosophy. Your recommended trainer is highlighted based on your fitness goals. Tap a trainer to select them.",
  },
  {
    id: "equipment",
    title: "Equipment Settings",
    icon: Dumbbell,
    tier: "free",
    description:
      "Configure what equipment you have access to—from bodyweight-only to full gym. Set defaults in your profile or override per workout.",
    howToUse:
      "In your Profile, set your default equipment access (none, limited, full gym) and check specific items you own. When generating a workout, you can override these settings for that specific session.",
  },
  // BASIC TIER
  {
    id: "monthly-workouts",
    title: "Monthly Workouts",
    icon: Sparkles,
    tier: "basic",
    description:
      "Generate 20 AI-powered workouts per month (text-only, no images). Perfect for consistent training without visual guides.",
    howToUse:
      "Basic tier members get 20 workout generations per month. Each workout includes detailed exercise instructions, sets, reps, and rest times. Your monthly limit resets on the first of each month.",
  },
  {
    id: "focus-areas",
    title: "Trainer Focus Areas",
    icon: Target,
    tier: "basic",
    description:
      "Each trainer offers 3-4 specialty focuses. Pick one for a targeted session, or let the trainer blend all their specialties for variety.",
    howToUse:
      "After selecting a trainer, you'll see their focus areas (e.g., Strength Training, Powerlifting, Functional Fitness for Marcus Chen). Select one to specialize, or skip to let the trainer create a blended workout.",
  },
  // PRO TIER
  {
    id: "exercise-images",
    title: "Exercise Images",
    icon: Image,
    tier: "pro",
    description:
      "AI-generated images showing proper form for each exercise in your workout. Visual guidance helps ensure you're performing movements correctly.",
    howToUse:
      "After generating a workout, Pro and Elite users can generate exercise images. Images are created on-demand and show the peak contraction point of each movement. Pro tier includes 10 workouts with images per month.",
  },
  {
    id: "workout-history",
    title: "Workout History",
    icon: History,
    tier: "pro",
    description:
      "Track all your completed workouts with stats on duration, exercises completed, and completion rates. Revisit past sessions anytime.",
    howToUse:
      "Access History from your Dashboard or navigation. Filter by date, trainer, or completion status. Click any workout to view full details or regenerate a similar session.",
  },
  // ELITE TIER
  {
    id: "unlimited-workouts",
    title: "Unlimited Workouts",
    icon: Infinity,
    tier: "elite",
    description:
      "No monthly limits on workout generation. Create as many AI-powered workouts as you need to support your training schedule.",
    howToUse:
      "Simply generate workouts whenever you need them—no usage counter, no limits. Elite members also get 20 workouts with AI exercise images per month.",
  },
  {
    id: "coach-access",
    title: "Coach Access",
    icon: MessageCircle,
    tier: "elite",
    description:
      "Direct access to certified fitness coaches for personalized guidance, form checks, and program adjustments.",
    howToUse:
      "Coming soon: Elite members will be able to connect with real coaches for feedback on their workouts and training progress.",
  },
];

// Tier order for comparison
const TIER_ORDER: TierId[] = [
  "free",
  "basic",
  "pro",
  "elite",
  "coach",
  "coach_pro",
];

// Check if user's tier includes access to a feature
function hasAccess(userTier: TierId, featureTier: TierId): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(featureTier);
}

// Tier badge styling
const TIER_BADGE_STYLES: Record<TierId, string> = {
  free: "bg-muted text-muted-foreground border-muted-foreground/20",
  basic: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  pro: "bg-primary/15 text-primary border-primary/30",
  elite: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  coach: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  coach_pro: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
};

const TIER_LABELS: Record<TierId, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  elite: "Elite",
  coach: "Coach",
  coach_pro: "Coach Pro",
};

export function FeatureFAQSection({ user }: FeatureFAQSectionProps) {
  const { tier, status, loading } = useSubscription();

  // Calculate effective tier: inactive paid subscriptions should be treated as free
  const effectiveTier: TierId = useMemo(() => {
    if (loading) return "free";
    if (tier === "free") return "free";
    // Only paid tiers with active status get access to their tier features
    if (status === "active") return tier;
    // Inactive paid tier: treat as free
    return "free";
  }, [tier, status, loading]);

  const renderFeature = (feature: Feature) => {
    const Icon = feature.icon;
    const accessible = user ? hasAccess(effectiveTier, feature.tier) : false;

    return (
      <AccordionItem
        key={feature.id}
        value={feature.id}
        className="border-b border-border/50 lg:last:border-b-0 [&:nth-last-child(-n+2)]:lg:border-b-0"
      >
        <AccordionTrigger className="hover:no-underline py-4 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                accessible || !user
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-medium text-left">{feature.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              {user && accessible && (
                <span
                  className="flex items-center gap-1 text-xs text-green-600"
                  aria-label="Available"
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Available</span>
                </span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-normal shrink-0",
                  TIER_BADGE_STYLES[feature.tier]
                )}
              >
                {TIER_LABELS[feature.tier]}
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          <div className="space-y-3 pr-4">
            <p>{feature.description}</p>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="font-medium text-foreground">How to use: </span>
              {feature.howToUse}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <section className="py-16 sm:py-24 bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Feature{" "}
            <span className="bg-gradient-to-r from-tertiary to-complementary bg-clip-text text-transparent">
              Guide
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {user
              ? "Explore what you can do with your current plan—and discover what's possible with upgrades."
              : "Learn how each feature helps you train smarter and reach your goals faster."}
          </p>
        </div>

        {/* Single Accordion with grid layout - two columns on desktop, single column on mobile */}
        <Accordion
          type="single"
          collapsible
          className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0"
        >
          {FEATURES.map(renderFeature)}
        </Accordion>
      </div>
    </section>
  );
}
