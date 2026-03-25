import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  trackWorkoutDetailsTourDeferredMobile,
  trackWorkoutDetailsTourStarted,
  trackWorkoutDetailsTourStepViewed,
  trackWorkoutDetailsTourStepCompleted,
  trackWorkoutDetailsTourTargetMissing,
  trackWorkoutDetailsTourDismissed,
  trackWorkoutDetailsTourCompleted,
  trackWorkoutDetailsTourReplayRequested,
} from "@/lib/workout-details-tour-analytics";

vi.mock("@/lib/posthog", () => ({
  captureEvent: vi.fn(),
}));

import { captureEvent } from "@/lib/posthog";

describe("workout-details-tour-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks deferred mobile", () => {
    trackWorkoutDetailsTourDeferredMobile("workout-456");

    expect(captureEvent).toHaveBeenCalledWith(
      "workout_details_tour_deferred_mobile",
      {
        workout_id: "workout-456",
        reason: "viewport_below_lg",
      }
    );
  });

  it("tracks started with anchor context", () => {
    trackWorkoutDetailsTourStarted({
      workoutId: "workout-123",
      anchorSectionIndex: 0,
      anchorExerciseIndex: 2,
    });

    expect(captureEvent).toHaveBeenCalledWith("workout_details_tour_started", {
      workout_id: "workout-123",
      anchor_section_index: 0,
      anchor_exercise_index: 2,
    });
  });

  it("tracks step viewed and completed", () => {
    trackWorkoutDetailsTourStepViewed("ai-edit", 0);
    trackWorkoutDetailsTourStepCompleted("ai-edit", 0, 1);

    expect(captureEvent).toHaveBeenNthCalledWith(
      1,
      "workout_details_tour_step_viewed",
      {
        step_id: "ai-edit",
        step_index: 0,
      }
    );
    expect(captureEvent).toHaveBeenNthCalledWith(
      2,
      "workout_details_tour_step_completed",
      {
        step_id: "ai-edit",
        from_index: 0,
        to_index: 1,
      }
    );
  });

  it("tracks target missing with source", () => {
    trackWorkoutDetailsTourTargetMissing("order-check", 2, "listener_retry");

    expect(captureEvent).toHaveBeenCalledWith(
      "workout_details_tour_target_missing",
      {
        step_id: "order-check",
        step_index: 2,
        reason: "target_missing",
        source: "listener_retry",
      }
    );
  });

  it("tracks dismissed with optional reason", () => {
    trackWorkoutDetailsTourDismissed("coach-info", 4, "skip_button");

    expect(captureEvent).toHaveBeenCalledWith(
      "workout_details_tour_dismissed",
      {
        step_id: "coach-info",
        step_index: 4,
        reason: "skip_button",
      }
    );
  });

  it("tracks completed with optional duration", () => {
    trackWorkoutDetailsTourCompleted("workout-123", 33);

    expect(captureEvent).toHaveBeenCalledWith(
      "workout_details_tour_completed",
      {
        workout_id: "workout-123",
        duration_seconds: 33,
      }
    );
  });

  it("tracks replay requested with source", () => {
    trackWorkoutDetailsTourReplayRequested("profile_manual");

    expect(captureEvent).toHaveBeenCalledWith(
      "workout_details_tour_replay_requested",
      { source: "profile_manual" }
    );
  });
});
