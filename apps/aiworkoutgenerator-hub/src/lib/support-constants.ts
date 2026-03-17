// ============================================
// Support Center Constants
// ============================================

import type {
  SupportRequestType,
  SupportImpact,
  WorkoutFeedbackData,
} from "@/types/support";

// ============================================
// Type Options
// ============================================

export interface SupportTypeOption {
  value: SupportRequestType;
  label: string;
  description: string;
  icon?: string;
}

export const SUPPORT_TYPE_OPTIONS: SupportTypeOption[] = [
  {
    value: "question",
    label: "Question",
    description: "Ask a question about the app, workouts, or training.",
  },
  {
    value: "workout_feedback",
    label: "Fix my workout",
    description:
      "Too hard/easy, wrong equipment, doesn't match my goal, needs swaps.",
  },
  {
    value: "bug",
    label: "Something's broken",
    description:
      "Workout won't generate, saving fails, login issues, weird errors.",
  },
  {
    value: "feature",
    label: "Feature idea",
    description: "Something you wish the app could do.",
  },
  {
    value: "coaching",
    label: "Coaching / program help",
    description:
      "Accountability, progression, form checks, nutrition structure.",
  },
  {
    value: "billing",
    label: "Billing / account",
    description: "Upgrade/downgrade, charges, cancellations, receipts.",
  },
];

// ============================================
// Impact Options
// ============================================

export interface ImpactOption {
  value: SupportImpact;
  label: string;
  description: string;
}

export const IMPACT_OPTIONS: ImpactOption[] = [
  {
    value: "blocked",
    label: "Blocked",
    description: "Can't use the app",
  },
  {
    value: "major",
    label: "Major issue",
    description: "Significantly impacts my experience",
  },
  {
    value: "minor",
    label: "Minor / suggestion",
    description: "Nice to have or small improvement",
  },
];

// ============================================
// Workout Feedback Options
// ============================================

export interface IntensityOption {
  value: WorkoutFeedbackData["intensity"];
  label: string;
}

export const INTENSITY_OPTIONS: IntensityOption[] = [
  { value: "too_easy", label: "Too easy" },
  { value: "right", label: "About right" },
  { value: "too_hard", label: "Too hard" },
  { value: "unsure", label: "Not sure" },
];

export interface TimeFitOption {
  value: WorkoutFeedbackData["timeFit"];
  label: string;
}

export const TIME_FIT_OPTIONS: TimeFitOption[] = [
  { value: "too_short", label: "Too short" },
  { value: "right", label: "Right length" },
  { value: "too_long", label: "Too long" },
];

export interface MismatchTag {
  value: string;
  label: string;
}

export const MISMATCH_TAGS: MismatchTag[] = [
  { value: "equipment", label: "Equipment didn't match" },
  { value: "impact", label: "Too much impact/jumping" },
  { value: "muscle_group", label: "Too much of one muscle group" },
  { value: "exercises", label: "Exercises I can't do" },
  { value: "goal", label: "Didn't match my goal" },
  { value: "complexity", label: "Too complicated" },
  { value: "progression", label: "Not enough progression" },
  { value: "other", label: "Other" },
];

export interface TrainingGoal {
  value: string;
  label: string;
}

export const TRAINING_GOALS: TrainingGoal[] = [
  { value: "lose_fat", label: "Lose fat" },
  { value: "build_muscle", label: "Build muscle" },
  { value: "get_stronger", label: "Get stronger" },
  { value: "athletic", label: "Athletic" },
  { value: "mobility", label: "Mobility" },
  { value: "back_in_shape", label: "Back in shape" },
  { value: "other", label: "Other" },
];

export interface WinCondition {
  value: string;
  label: string;
}

export const WIN_CONDITIONS: WinCondition[] = [
  {
    value: "progression",
    label: "Clear week-to-week progression",
  },
  {
    value: "substitutions",
    label: "Better substitutions for my body",
  },
  {
    value: "safety",
    label: "Safer choices / less risky programming",
  },
  {
    value: "structure",
    label: "More structure / less randomness",
  },
  {
    value: "scheduling",
    label: "Better scheduling consistency",
  },
  {
    value: "nutrition",
    label: "Nutrition structure",
  },
  {
    value: "accountability",
    label: "Accountability / check-ins",
  },
];

// ============================================
// Billing Issue Types
// ============================================

export interface BillingIssueType {
  value: "upgrade_downgrade" | "charges" | "cancellations" | "receipts";
  label: string;
}

export const BILLING_ISSUE_TYPES: BillingIssueType[] = [
  { value: "upgrade_downgrade", label: "Upgrade/downgrade" },
  { value: "charges", label: "Charges" },
  { value: "cancellations", label: "Cancellations" },
  { value: "receipts", label: "Receipts" },
];

// ============================================
// UX Copy
// ============================================

export const SUPPORT_CENTER_COPY = {
  title: "Help & Feedback",
  subhead:
    "This goes straight to Justin (founder + trainer). If you tell me your goal + what feels off, I can tune your next workouts.",
  responseTime: "Avg response: 1-2 business days",
  step1Prompt: "What do you need right now?",
  submitButton: "Send to Justin",
  successMessage: "Got it. I'm going to use this to tune your next workouts.",
  followUpMessage: "I'll follow up at {email}.",
  authRequiredMessage: "To attach your workout details, please sign in.",
  contextPreviewTitle: "We automatically attach",
  contextPreviewItems: [
    "Workout details",
    "Device info",
    "Subscription tier",
    "Current route",
  ],
} as const;

// ============================================
// Coach Upsell
// ============================================

export const COACH_UPSELL = {
  title: "Want hands-on help, not just better AI?",
  description: "Coach tiers exist for progression + feedback + accountability.",
  ctaPrimary: "See Coach options",
  ctaSecondary: "Not now",
} as const;

// ============================================
// Subject Generation
// ============================================

/**
 * Generate a subject line from support request type and impact
 */
export function generateSupportSubject(
  type: SupportRequestType,
  impact: SupportImpact
): string {
  const typeLabels: Record<SupportRequestType, string> = {
    workout_feedback: "Workout Feedback",
    bug: "Bug Report",
    billing: "Billing Issue",
    feature: "Feature Idea",
    coaching: "Coaching Help",
    question: "Question",
  };

  const impactLabels: Record<SupportImpact, string> = {
    blocked: "Blocked",
    major: "Major Issue",
    minor: "Minor / Suggestion",
  };

  return `${typeLabels[type]} - ${impactLabels[impact]}`;
}
