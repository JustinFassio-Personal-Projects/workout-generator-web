/**
 * PostHog analytics utilities for workout details onboarding tour.
 *
 * Phase 1 provides typed wrappers only; events are wired by the tour controller.
 */

import { captureEvent } from "@/lib/posthog";

export type WorkoutDetailsTourStepId =
  | "ai-edit"
  | "add-exercise"
  | "order-check"
  | "select-image"
  | "coach-info";

interface WorkoutDetailsTourContext {
  workoutId: string;
  anchorSectionIndex: number;
  anchorExerciseIndex: number;
}

/**
 * Track when the tour is eligible but not auto-started on a below-lg viewport (Phase 4 desktop-only MVP).
 */
export function trackWorkoutDetailsTourDeferredMobile(workoutId: string): void {
  captureEvent("workout_details_tour_deferred_mobile", {
    workout_id: workoutId,
    reason: "viewport_below_lg",
  });
}

/**
 * Track when the workout details tour starts.
 */
export function trackWorkoutDetailsTourStarted(
  context: WorkoutDetailsTourContext
): void {
  captureEvent("workout_details_tour_started", {
    workout_id: context.workoutId,
    anchor_section_index: context.anchorSectionIndex,
    anchor_exercise_index: context.anchorExerciseIndex,
  });
}

/**
 * Track when a tour step becomes visible to the user.
 */
export function trackWorkoutDetailsTourStepViewed(
  stepId: WorkoutDetailsTourStepId,
  stepIndex: number
): void {
  captureEvent("workout_details_tour_step_viewed", {
    step_id: stepId,
    step_index: stepIndex,
  });
}

/**
 * Track when the user completes a required step action.
 */
export function trackWorkoutDetailsTourStepCompleted(
  stepId: WorkoutDetailsTourStepId,
  fromIndex: number,
  toIndex: number
): void {
  captureEvent("workout_details_tour_step_completed", {
    step_id: stepId,
    from_index: fromIndex,
    to_index: toIndex,
  });
}

/**
 * Track when the tour cannot find the DOM target for a step (retry exhausted or Joyride error).
 */
export function trackWorkoutDetailsTourTargetMissing(
  stepId: WorkoutDetailsTourStepId | "unknown",
  stepIndex: number,
  source?: "listener_retry" | "joyride_error"
): void {
  captureEvent("workout_details_tour_target_missing", {
    step_id: stepId,
    step_index: stepIndex,
    reason: "target_missing",
    source,
  });
}

/**
 * Track when the user dismisses/skips the tour before completion.
 */
export function trackWorkoutDetailsTourDismissed(
  stepId: WorkoutDetailsTourStepId | "unknown",
  stepIndex: number,
  reason?: string
): void {
  captureEvent("workout_details_tour_dismissed", {
    step_id: stepId,
    step_index: stepIndex,
    reason,
  });
}

/**
 * Track when the user fully completes the tour.
 */
export function trackWorkoutDetailsTourCompleted(
  workoutId: string,
  durationSeconds?: number
): void {
  captureEvent("workout_details_tour_completed", {
    workout_id: workoutId,
    duration_seconds: durationSeconds,
  });
}

export function trackWorkoutDetailsTourReplayRequested(source: string): void {
  captureEvent("workout_details_tour_replay_requested", {
    source,
  });
}

export const workoutDetailsTourAnalytics = {
  trackWorkoutDetailsTourDeferredMobile,
  trackWorkoutDetailsTourStarted,
  trackWorkoutDetailsTourStepViewed,
  trackWorkoutDetailsTourStepCompleted,
  trackWorkoutDetailsTourTargetMissing,
  trackWorkoutDetailsTourDismissed,
  trackWorkoutDetailsTourCompleted,
  trackWorkoutDetailsTourReplayRequested,
};
