import type { UserProfile } from "@/types/firestore";

/**
 * Bump when the guided workout-details tour script materially changes (steps,
 * data-tour targets, or copy/flow that warrants a fresh pass). Users who
 * completed or dismissed an older script become auto-launch eligible again.
 */
export const WORKOUT_DETAILS_TOUR_SCRIPT_VERSION = 1;

export function effectiveCompletedScriptVersion(profile: UserProfile): number {
  if (
    typeof profile.workout_details_tour_completed_script_version === "number"
  ) {
    return profile.workout_details_tour_completed_script_version;
  }
  if (profile.workout_details_tour_completed === true) return 1;
  return 0;
}

export function effectiveDismissedScriptVersion(profile: UserProfile): number {
  if (
    typeof profile.workout_details_tour_dismissed_script_version === "number"
  ) {
    return profile.workout_details_tour_dismissed_script_version;
  }
  if (profile.workout_details_tour_dismissed === true) return 1;
  return 0;
}

export function isWorkoutDetailsTourAutoLaunchEligible(
  profile: UserProfile
): boolean {
  return (
    effectiveCompletedScriptVersion(profile) <
      WORKOUT_DETAILS_TOUR_SCRIPT_VERSION &&
    effectiveDismissedScriptVersion(profile) <
      WORKOUT_DETAILS_TOUR_SCRIPT_VERSION
  );
}

/** Patch for Profile “Replay tour”: clears completion/dismissal for the current script. */
export function buildWorkoutDetailsTourReplayResetPatch(): Partial<UserProfile> {
  return {
    workout_details_tour_completed: false,
    workout_details_tour_completed_at: null,
    workout_details_tour_dismissed: false,
    workout_details_tour_dismissed_at: null,
    workout_details_tour_completed_script_version: 0,
    workout_details_tour_dismissed_script_version: 0,
  };
}
