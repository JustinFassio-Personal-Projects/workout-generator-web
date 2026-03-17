import type { DeviceType, SupportRequestContext } from "@/types/support";
import type { TrainerWorkout } from "@/types/firestore";
import { timestampToDate } from "@/lib/utils/timestamp";

/**
 * Detect device type based on window width.
 * Uses width-based detection for simplicity.
 */
export const detectDeviceType = (): DeviceType => {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

/**
 * Extract UTM parameters from the current URL.
 * Returns an object with UTM parameters if present.
 */
export const extractUTMParams = (): Record<string, string> => {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const utmParams: Record<string, string> = {};

  const utmKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  for (const key of utmKeys) {
    const value = params.get(key);
    if (value) {
      utmParams[key] = value;
    }
  }

  return utmParams;
};

/**
 * Collect automatic context for support requests.
 * Includes route, URL, device info, timezone, locale, etc.
 */
export const collectSupportContext = (): Omit<
  SupportRequestContext,
  "workoutId" | "workoutCreatedAt" | "generatorInputs" | "workoutSummary"
> => {
  if (typeof window === "undefined") {
    return {
      app: "aiworkoutgenerator",
    };
  }

  return {
    app: "aiworkoutgenerator",
    route: window.location.pathname,
    url: window.location.href,
    userAgent: navigator.userAgent,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestampClient: new Date().toISOString(),
  };
};

/**
 * Extract workout context from a TrainerWorkout document.
 * Returns a snapshot of key workout data for support requests.
 */
export const extractWorkoutContext = (
  workout: TrainerWorkout
): Pick<
  SupportRequestContext,
  "workoutId" | "workoutCreatedAt" | "generatorInputs" | "workoutSummary"
> => {
  const context: Pick<
    SupportRequestContext,
    "workoutId" | "workoutCreatedAt" | "generatorInputs" | "workoutSummary"
  > = {
    workoutId: workout.id,
  };

  // Extract created_at timestamp
  if (workout.created_at) {
    try {
      const date = timestampToDate(workout.created_at);
      // Only set if date is valid (not epoch date)
      if (date.getTime() > 0) {
        context.workoutCreatedAt = date.toISOString();
      }
    } catch (error) {
      // Silently skip invalid timestamps
      console.warn("Failed to extract workout created_at timestamp:", error);
    }
  }

  // Extract generator inputs from generation_context (if available)
  if (workout.generation_context) {
    context.generatorInputs = {
      goal: workout.focus || undefined,
      equipment:
        workout.generation_context.profile_snapshot?.available_equipment || [],
      duration: workout.duration_minutes,
      split: undefined, // Not available in current schema
      constraints: workout.generation_context.profile_snapshot?.injuries || [],
    };
  }

  // Create workout summary (key fields only, not entire workout)
  const exerciseCount =
    workout.sections?.reduce(
      (total, section) => total + (section.exercises?.length || 0),
      0
    ) || 0;
  context.workoutSummary = {
    title: workout.title,
    focus: workout.focus,
    difficulty: workout.difficulty,
    duration_minutes: workout.duration_minutes,
    total_duration: workout.totalDuration,
    exercise_count: exerciseCount,
  };

  return context;
};
