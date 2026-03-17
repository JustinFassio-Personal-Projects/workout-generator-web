/**
 * PostHog analytics utilities for onboarding flow tracking
 *
 * This module provides typed event tracking functions for the onboarding wizards.
 * All events are designed to be privacy-compliant (no PII).
 */

import { captureEvent } from "@/lib/posthog";

export type OnboardingType = "main" | "continue";

export type StepName =
  | "summary"
  | "basic_info"
  | "body_stats"
  | "fitness"
  | "goals"
  | "safety"
  | "equipment"
  | "training_preferences"
  | "experience"
  | "name";

/**
 * Track when user starts onboarding
 */
export function trackStarted(
  type: OnboardingType,
  userId: string | undefined,
  source?: string
): void {
  captureEvent("onboarding_started", {
    flow: type,
    user_id: userId,
    source: source || "unknown",
  });
}

/**
 * Track when a step is viewed
 */
export function trackStepViewed(
  type: OnboardingType,
  stepNumber: number,
  stepName: StepName,
  totalSteps: number,
  progressPercent: number
): void {
  captureEvent("onboarding_step_viewed", {
    flow: type,
    step_number: stepNumber,
    step_name: stepName,
    total_steps: totalSteps,
    progress_percent: Math.round(progressPercent),
  });
}

/**
 * Track when user clicks "Next" or "Continue"
 */
export function trackStepNext(
  type: OnboardingType,
  fromStep: number,
  toStep: number,
  stepName: StepName
): void {
  captureEvent("onboarding_step_next", {
    flow: type,
    from_step: fromStep,
    to_step: toStep,
    step_name: stepName,
  });
}

/**
 * Track when user clicks "Back"
 */
export function trackStepBack(
  type: OnboardingType,
  fromStep: number,
  toStep: number,
  stepName: StepName
): void {
  captureEvent("onboarding_step_back", {
    flow: type,
    from_step: fromStep,
    to_step: toStep,
    step_name: stepName,
  });
}

/**
 * Track when onboarding is successfully completed
 */
export function trackCompleted(
  type: OnboardingType,
  totalSteps: number,
  startTime: number,
  metadata: {
    has_injuries: boolean;
    has_medical_conditions: boolean;
    equipment_access: string | string[]; // Changed from string to string | string[] (supports both legacy enum and new categories)
    fitness_level: string;
  }
): void {
  const completionTimeSeconds = Math.round((Date.now() - startTime) / 1000);

  captureEvent("onboarding_completed", {
    flow: type,
    total_steps: totalSteps,
    completion_time_seconds: completionTimeSeconds,
    has_injuries: metadata.has_injuries,
    has_medical_conditions: metadata.has_medical_conditions,
    equipment_access: Array.isArray(metadata.equipment_access)
      ? metadata.equipment_access.join(",")
      : metadata.equipment_access,
    fitness_level: metadata.fitness_level,
  });
}

/**
 * Track when user abandons onboarding
 */
export function trackAbandoned(
  type: OnboardingType,
  abandonedAtStep: number,
  progressPercent: number,
  startTime: number
): void {
  const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);

  captureEvent("onboarding_abandoned", {
    flow: type,
    abandoned_at_step: abandonedAtStep,
    progress_percent: Math.round(progressPercent),
    time_spent_seconds: timeSpentSeconds,
  });
}

/**
 * Track onboarding errors
 */
export function trackError(
  type: OnboardingType,
  errorType: "validation" | "save_failed" | "authentication",
  stepNumber: number,
  errorMessage: string,
  errorCode?: string
): void {
  // Sanitize error message to remove potential PII
  const sanitizedMessage = errorMessage
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]")
    .substring(0, 200); // Limit length

  captureEvent("onboarding_error", {
    flow: type,
    error_type: errorType,
    error_message: sanitizedMessage,
    step_number: stepNumber,
    error_code: errorCode,
  });
}

/**
 * Helper function to get step name for main onboarding
 */
export function getMainStepName(stepNumber: number): StepName {
  const stepMap: Record<number, StepName> = {
    1: "basic_info",
    2: "body_stats",
    3: "fitness",
    4: "goals",
    5: "safety",
    6: "equipment",
    7: "training_preferences",
    8: "experience",
  };
  return stepMap[stepNumber] || "basic_info";
}

/**
 * Helper function to get step name for Phase B onboarding
 */
export function getPhaseBStepName(stepNumber: number): StepName {
  const stepMap: Record<number, StepName> = {
    1: "summary",
    2: "name",
    3: "body_stats",
    4: "safety",
    5: "equipment",
  };
  return stepMap[stepNumber] || "summary";
}

/**
 * Consolidated analytics object for easy import
 */
export const onboardingAnalytics = {
  trackStarted,
  trackStepViewed,
  trackStepNext,
  trackStepBack,
  trackCompleted,
  trackAbandoned,
  trackError,
  getMainStepName,
  getPhaseBStepName,
};
