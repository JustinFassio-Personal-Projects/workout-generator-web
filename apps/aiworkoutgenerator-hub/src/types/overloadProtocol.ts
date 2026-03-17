/**
 * Overload Protocol Types
 *
 * Defines the three progression protocols available for workout iteration:
 * - Linear Load: Add weight, keep reps static
 * - Double Progression: Add reps until max, then increase weight
 * - Density & Leverage: Reduce rest or use harder variations
 */

/**
 * Overload protocol identifiers
 */
export type OverloadProtocol =
  | "linear_load"
  | "double_progression"
  | "density_leverage";

/**
 * Configuration for an overload protocol
 */
export interface OverloadProtocolConfig {
  id: OverloadProtocol;
  name: string;
  shortName: string;
  description: string;
  bestFor: string[];
  progressionLogic: string;
  icon: "weight" | "trending-up" | "zap"; // For UI display
}

/**
 * Predefined protocol configurations
 */
export const OVERLOAD_PROTOCOLS: Record<
  OverloadProtocol,
  OverloadProtocolConfig
> = {
  linear_load: {
    id: "linear_load",
    name: "Linear Load Progression",
    shortName: "Linear Load",
    description:
      "Focus on adding weight while keeping reps static. Best for building raw strength with compound movements.",
    bestFor: [
      "Barbell compounds",
      "Beginners",
      "Pure Strength",
      "Powerlifting",
    ],
    progressionLogic:
      "Keep reps static. Increase load by 2-5% from the previous workout. Maintain form quality.",
    icon: "weight",
  },
  double_progression: {
    id: "double_progression",
    name: "Double Progression",
    shortName: "Double Progression",
    description:
      "First add reps within a range, then increase weight when you hit the top of the range. Great for hypertrophy.",
    bestFor: [
      "Hypertrophy",
      "Dumbbells",
      "Isolation movements",
      "Intermediate lifters",
    ],
    progressionLogic:
      "Assign a rep range (e.g., 8-12). Start at the bottom of the range. Add reps each session until you hit the top, then increase load and reset to bottom of range.",
    icon: "trending-up",
  },
  density_leverage: {
    id: "density_leverage",
    name: "Density & Leverage",
    shortName: "Density & Leverage",
    description:
      "Increase workout density by reducing rest periods or progress to harder exercise variations.",
    bestFor: [
      "Calisthenics",
      "Home Workouts",
      "Conditioning",
      "Bodyweight training",
    ],
    progressionLogic:
      "Weeks 1-3: Increase total volume. Weeks 4-6: Decrease rest periods or increase movement difficulty (e.g., Squat to Jump Squat, Push-up to Archer Push-up).",
    icon: "zap",
  },
};

/**
 * Get all protocol configs as an array
 */
export function getAllProtocols(): OverloadProtocolConfig[] {
  return Object.values(OVERLOAD_PROTOCOLS);
}

/**
 * Get a specific protocol config by ID
 */
export function getProtocolConfig(
  protocol: OverloadProtocol
): OverloadProtocolConfig {
  return OVERLOAD_PROTOCOLS[protocol];
}

/**
 * Determine recommended protocol based on workout characteristics
 */
export function getRecommendedProtocol(
  hasBarbell: boolean,
  isBodyweightOnly: boolean,
  fitnessGoals: string[]
): OverloadProtocol {
  // Check for strength-focused goals
  const isStrengthFocused = fitnessGoals.some(
    (goal) =>
      goal.toLowerCase().includes("strength") ||
      goal.toLowerCase().includes("power")
  );

  // Check for hypertrophy goals
  const isHypertrophyFocused = fitnessGoals.some(
    (goal) =>
      goal.toLowerCase().includes("muscle") ||
      goal.toLowerCase().includes("hypertrophy") ||
      goal.toLowerCase().includes("size")
  );

  // Bodyweight-only workouts should use density/leverage
  if (isBodyweightOnly) {
    return "density_leverage";
  }

  // Barbell-heavy with strength focus = linear load
  if (hasBarbell && isStrengthFocused) {
    return "linear_load";
  }

  // Hypertrophy focus = double progression
  if (isHypertrophyFocused) {
    return "double_progression";
  }

  // Default to double progression as it's the most versatile
  return "double_progression";
}

/**
 * Contextual protocol guidance based on the selected workout's autoregulation data.
 * Returns a tailored message when the user's feedback suggests a modification to the default progression.
 */
export function getProtocolGuidance(
  summary: { weight_selection?: string | null; session_rpe?: number | null },
  protocol: OverloadProtocol
): string {
  if (protocol === "linear_load" && summary.weight_selection === "too_heavy") {
    return "Since weights felt too heavy last time, we'll maintain the same weight and focus on form quality before progressing.";
  }
  if (
    protocol === "double_progression" &&
    summary.session_rpe != null &&
    summary.session_rpe >= 9
  ) {
    return "High RPE detected. We'll prioritize adding 1-2 reps rather than jumping to heavier weights.";
  }
  return getProtocolConfig(protocol).progressionLogic;
}
