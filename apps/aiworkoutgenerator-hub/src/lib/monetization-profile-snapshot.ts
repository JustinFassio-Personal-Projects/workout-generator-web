import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

/**
 * Server-only: coarse profile fields for optional funnel analytics (see
 * `shouldIncludeProfileSnapshotInAnalytics` in record-purchase-subscription-analytics).
 */
export async function getMonetizationProfileSnapshot(
  uid: string
): Promise<Record<string, unknown> | null> {
  try {
    const snap = await adminDb.collection("user_profiles").doc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      fitness_level: data.fitness_level ?? null,
      current_activity_level: data.current_activity_level ?? null,
      fitness_goals: Array.isArray(data.fitness_goals)
        ? (data.fitness_goals as unknown[]).slice(0, 10)
        : [],
      preferred_workout_duration: data.preferred_workout_duration ?? null,
      workout_frequency_per_week: data.workout_frequency_per_week ?? null,
    };
  } catch (error) {
    logger.warn("Failed to load monetization profile snapshot", error, {
      operation: "getMonetizationProfileSnapshot",
    });
    return null;
  }
}
