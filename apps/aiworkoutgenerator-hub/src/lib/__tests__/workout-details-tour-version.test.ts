import { describe, expect, it } from "vitest";
import type { UserProfile } from "@/types/firestore";
import {
  WORKOUT_DETAILS_TOUR_SCRIPT_VERSION,
  buildWorkoutDetailsTourReplayResetPatch,
  effectiveCompletedScriptVersion,
  effectiveDismissedScriptVersion,
  isWorkoutDetailsTourAutoLaunchEligible,
} from "@/lib/workout-details-tour-version";

describe("workout-details-tour-version", () => {
  it("effectiveCompletedScriptVersion prefers explicit script version", () => {
    const profile = {
      workout_details_tour_completed_script_version: 3,
    } as unknown as UserProfile;

    expect(effectiveCompletedScriptVersion(profile)).toBe(3);
  });

  it("effectiveCompletedScriptVersion falls back to legacy boolean (true/false)", () => {
    const completedProfile = {
      workout_details_tour_completed: true,
    } as unknown as UserProfile;

    const notCompletedProfile = {
      workout_details_tour_completed: false,
    } as unknown as UserProfile;

    expect(effectiveCompletedScriptVersion(completedProfile)).toBe(1);
    expect(effectiveCompletedScriptVersion(notCompletedProfile)).toBe(0);
  });

  it("effectiveDismissedScriptVersion prefers explicit script version", () => {
    const profile = {
      workout_details_tour_dismissed_script_version: 2,
    } as unknown as UserProfile;

    expect(effectiveDismissedScriptVersion(profile)).toBe(2);
  });

  it("effectiveDismissedScriptVersion falls back to legacy boolean (true/false)", () => {
    const dismissedProfile = {
      workout_details_tour_dismissed: true,
    } as unknown as UserProfile;

    const notDismissedProfile = {
      workout_details_tour_dismissed: false,
    } as unknown as UserProfile;

    expect(effectiveDismissedScriptVersion(dismissedProfile)).toBe(1);
    expect(effectiveDismissedScriptVersion(notDismissedProfile)).toBe(0);
  });

  it("isWorkoutDetailsTourAutoLaunchEligible requires both completed/dismissed effective versions < script version", () => {
    const eligibleProfile = {
      workout_details_tour_completed_script_version: 0,
      workout_details_tour_dismissed_script_version: 0,
    } as unknown as UserProfile;

    const completedAtScriptVersion = {
      workout_details_tour_completed_script_version:
        WORKOUT_DETAILS_TOUR_SCRIPT_VERSION,
      workout_details_tour_dismissed_script_version: 0,
    } as unknown as UserProfile;

    const dismissedAtScriptVersion = {
      workout_details_tour_completed_script_version: 0,
      workout_details_tour_dismissed_script_version:
        WORKOUT_DETAILS_TOUR_SCRIPT_VERSION,
    } as unknown as UserProfile;

    expect(isWorkoutDetailsTourAutoLaunchEligible(eligibleProfile)).toBe(true);
    expect(
      isWorkoutDetailsTourAutoLaunchEligible(completedAtScriptVersion)
    ).toBe(false);
    expect(
      isWorkoutDetailsTourAutoLaunchEligible(dismissedAtScriptVersion)
    ).toBe(false);
  });

  it("buildWorkoutDetailsTourReplayResetPatch resets booleans and script versions to 0", () => {
    const patch = buildWorkoutDetailsTourReplayResetPatch();

    expect(patch.workout_details_tour_completed).toBe(false);
    expect(patch.workout_details_tour_completed_at).toBeNull();
    expect(patch.workout_details_tour_dismissed).toBe(false);
    expect(patch.workout_details_tour_dismissed_at).toBeNull();
    expect(patch.workout_details_tour_completed_script_version).toBe(0);
    expect(patch.workout_details_tour_dismissed_script_version).toBe(0);
  });
});
