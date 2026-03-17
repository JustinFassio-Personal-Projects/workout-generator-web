import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  trackStarted,
  trackStepViewed,
  trackStepNext,
  trackStepBack,
  trackCompleted,
  trackAbandoned,
  trackError,
  getMainStepName,
  getPhaseBStepName,
} from "@/lib/onboarding-analytics";

// Mock captureEvent
vi.mock("@/lib/posthog", () => ({
  captureEvent: vi.fn(),
}));

import { captureEvent } from "@/lib/posthog";

describe("onboarding-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackStarted", () => {
    it("should call captureEvent with correct parameters for main flow", () => {
      trackStarted("main", "user-123", "signup");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_started", {
        flow: "main",
        user_id: "user-123",
        source: "signup",
      });
    });

    it("should call captureEvent with correct parameters for continue flow", () => {
      trackStarted("continue", "user-456", "website_builder");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_started", {
        flow: "continue",
        user_id: "user-456",
        source: "website_builder",
      });
    });

    it("should handle undefined userId", () => {
      trackStarted("main", undefined, "signup");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_started", {
        flow: "main",
        user_id: undefined,
        source: "signup",
      });
    });

    it("should use 'unknown' as default source when not provided", () => {
      trackStarted("main", "user-123");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_started", {
        flow: "main",
        user_id: "user-123",
        source: "unknown",
      });
    });
  });

  describe("trackStepViewed", () => {
    it("should call captureEvent with correct parameters", () => {
      trackStepViewed("main", 3, "fitness", 8, 37.5);

      expect(captureEvent).toHaveBeenCalledWith("onboarding_step_viewed", {
        flow: "main",
        step_number: 3,
        step_name: "fitness",
        total_steps: 8,
        progress_percent: 38, // Math.round(37.5)
      });
    });

    it("should round progress percentage correctly", () => {
      trackStepViewed("continue", 2, "name", 5, 40.7);

      expect(captureEvent).toHaveBeenCalledWith("onboarding_step_viewed", {
        flow: "continue",
        step_number: 2,
        step_name: "name",
        total_steps: 5,
        progress_percent: 41,
      });
    });
  });

  describe("trackStepNext", () => {
    it("should call captureEvent with correct parameters", () => {
      trackStepNext("main", 2, 3, "body_stats");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_step_next", {
        flow: "main",
        from_step: 2,
        to_step: 3,
        step_name: "body_stats",
      });
    });
  });

  describe("trackStepBack", () => {
    it("should call captureEvent with correct parameters", () => {
      trackStepBack("continue", 3, 2, "body_stats");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_step_back", {
        flow: "continue",
        from_step: 3,
        to_step: 2,
        step_name: "body_stats",
      });
    });
  });

  describe("trackCompleted", () => {
    it("should calculate completion time correctly", () => {
      const startTime = Date.now() - 5000; // 5 seconds ago

      trackCompleted("main", 8, startTime, {
        has_injuries: true,
        has_medical_conditions: false,
        equipment_access: "full",
        fitness_level: "intermediate",
      });

      expect(captureEvent).toHaveBeenCalledWith("onboarding_completed", {
        flow: "main",
        total_steps: 8,
        completion_time_seconds: expect.any(Number),
        has_injuries: true,
        has_medical_conditions: false,
        equipment_access: "full",
        fitness_level: "intermediate",
      });

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        completion_time_seconds: number;
      };
      expect(callArgs.completion_time_seconds).toBeGreaterThanOrEqual(4);
      expect(callArgs.completion_time_seconds).toBeLessThanOrEqual(6);
    });

    it("should round completion time to nearest second", () => {
      const startTime = Date.now() - 1500; // 1.5 seconds ago

      trackCompleted("continue", 5, startTime, {
        has_injuries: false,
        has_medical_conditions: true,
        equipment_access: "none",
        fitness_level: "beginner",
      });

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        completion_time_seconds: number;
      };
      expect(callArgs.completion_time_seconds).toBeGreaterThanOrEqual(1);
      expect(callArgs.completion_time_seconds).toBeLessThanOrEqual(2);
    });
  });

  describe("trackAbandoned", () => {
    it("should calculate time spent correctly", () => {
      const startTime = Date.now() - 10000; // 10 seconds ago

      trackAbandoned("main", 3, 37.5, startTime);

      expect(captureEvent).toHaveBeenCalledWith("onboarding_abandoned", {
        flow: "main",
        abandoned_at_step: 3,
        progress_percent: 38, // Math.round(37.5)
        time_spent_seconds: expect.any(Number),
      });

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        time_spent_seconds: number;
      };
      expect(callArgs.time_spent_seconds).toBeGreaterThanOrEqual(9);
      expect(callArgs.time_spent_seconds).toBeLessThanOrEqual(11);
    });

    it("should round progress percentage and time spent", () => {
      const startTime = Date.now() - 2500; // 2.5 seconds ago

      trackAbandoned("continue", 2, 40.7, startTime);

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        progress_percent: number;
        time_spent_seconds: number;
      };
      expect(callArgs.progress_percent).toBe(41);
      expect(callArgs.time_spent_seconds).toBeGreaterThanOrEqual(2);
      expect(callArgs.time_spent_seconds).toBeLessThanOrEqual(3);
    });
  });

  describe("trackError", () => {
    it("should call captureEvent with correct parameters", () => {
      trackError(
        "main",
        "validation",
        3,
        "Missing required fields",
        "VALIDATION_ERROR"
      );

      expect(captureEvent).toHaveBeenCalledWith("onboarding_error", {
        flow: "main",
        error_type: "validation",
        error_message: "Missing required fields",
        step_number: 3,
        error_code: "VALIDATION_ERROR",
      });
    });

    it("should handle undefined errorCode", () => {
      trackError("continue", "save_failed", 5, "Failed to save profile");

      expect(captureEvent).toHaveBeenCalledWith("onboarding_error", {
        flow: "continue",
        error_type: "save_failed",
        error_message: "Failed to save profile",
        step_number: 5,
        error_code: undefined,
      });
    });

    it("should sanitize email addresses from error messages", () => {
      trackError(
        "main",
        "validation",
        2,
        "User test@example.com has invalid data",
        "VALIDATION_ERROR"
      );

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        error_message: string;
      };
      expect(callArgs.error_message).toBe("User [email] has invalid data");
    });

    it("should sanitize SSNs from error messages", () => {
      trackError(
        "continue",
        "save_failed",
        4,
        "Error for user with SSN 123-45-6789",
        "SAVE_ERROR"
      );

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        error_message: string;
      };
      expect(callArgs.error_message).toBe("Error for user with SSN [ssn]");
    });

    it("should sanitize both emails and SSNs", () => {
      trackError(
        "main",
        "authentication",
        1,
        "User john@example.com with SSN 987-65-4321 failed",
        "AUTH_ERROR"
      );

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        error_message: string;
      };
      expect(callArgs.error_message).toBe("User [email] with SSN [ssn] failed");
    });

    it("should limit error message length to 200 characters", () => {
      const longMessage = "A".repeat(250);
      trackError("continue", "validation", 3, longMessage);

      const callArgs = vi.mocked(captureEvent).mock.calls[0][1] as {
        error_message: string;
      };
      expect(callArgs.error_message.length).toBe(200);
      expect(callArgs.error_message).toBe("A".repeat(200));
    });

    it("should handle all error types", () => {
      const errorTypes: Array<"validation" | "save_failed" | "authentication"> =
        ["validation", "save_failed", "authentication"];

      errorTypes.forEach((errorType) => {
        vi.clearAllMocks();
        trackError("main", errorType, 1, "Test error");

        expect(captureEvent).toHaveBeenCalledWith("onboarding_error", {
          flow: "main",
          error_type: errorType,
          error_message: "Test error",
          step_number: 1,
          error_code: undefined,
        });
      });
    });
  });

  describe("getMainStepName", () => {
    it("should return correct step names for valid step numbers", () => {
      expect(getMainStepName(1)).toBe("basic_info");
      expect(getMainStepName(2)).toBe("body_stats");
      expect(getMainStepName(3)).toBe("fitness");
      expect(getMainStepName(4)).toBe("goals");
      expect(getMainStepName(5)).toBe("safety");
      expect(getMainStepName(6)).toBe("equipment");
      expect(getMainStepName(7)).toBe("training_preferences");
      expect(getMainStepName(8)).toBe("experience");
    });

    it("should return 'basic_info' as fallback for invalid step numbers", () => {
      expect(getMainStepName(0)).toBe("basic_info");
      expect(getMainStepName(9)).toBe("basic_info");
      expect(getMainStepName(100)).toBe("basic_info");
      expect(getMainStepName(-1)).toBe("basic_info");
    });
  });

  describe("getPhaseBStepName", () => {
    it("should return correct step names for valid step numbers", () => {
      expect(getPhaseBStepName(1)).toBe("summary");
      expect(getPhaseBStepName(2)).toBe("name");
      expect(getPhaseBStepName(3)).toBe("body_stats");
      expect(getPhaseBStepName(4)).toBe("safety");
      expect(getPhaseBStepName(5)).toBe("equipment");
    });

    it("should return 'summary' as fallback for invalid step numbers", () => {
      expect(getPhaseBStepName(0)).toBe("summary");
      expect(getPhaseBStepName(6)).toBe("summary");
      expect(getPhaseBStepName(100)).toBe("summary");
      expect(getPhaseBStepName(-1)).toBe("summary");
    });
  });
});
