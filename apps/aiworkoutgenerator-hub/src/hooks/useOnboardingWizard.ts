import { useState, useEffect, useMemo, useRef } from "react";
import {
  ProfileService,
  type Phase1ProfileInput,
} from "@/services/profile/ProfileService";
import {
  onboardingAnalytics,
  getMainStepName,
} from "@/lib/onboarding-analytics";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import { getPhaseAData } from "@/lib/phaseAStorage";
import { EquipmentCategoryService } from "@/services/equipment/EquipmentCategoryService";
import { validateCategories } from "@/lib/equipment-categories";
import type { FitnessLevel } from "@/types/firestore";

const TOTAL_STEPS = 8;

const DEFAULT_DATA: Partial<Phase1ProfileInput> = {
  gender: "prefer_not_to_say",
  preferred_units: {
    weight: "lb",
    height: "in",
    distance: "mi",
    temperature: "f",
  },
  fitness_level: "beginner",
  current_activity_level: "moderately_active",
  equipment_access: [], // Changed from "none" enum to empty array
  injuries: [],
  medical_conditions: [],
  fitness_goals: [],
  available_equipment: [],
  injury_details: null,
  medical_notes: null,
};

/**
 * Parse displayName into first and last name
 * Handles various formats: "John Doe", "John", "John Middle Doe", etc.
 */
function parseDisplayName(displayName: string | null | undefined): {
  first_name?: string;
  last_name?: string;
} {
  if (!displayName?.trim()) {
    return {};
  }

  const parts = displayName.trim().split(/\s+/);

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    // Only one name provided - treat as first name
    return { first_name: parts[0] };
  }

  // Multiple parts: first name is first part, last name is last part
  // Middle names/initials are ignored
  return {
    first_name: parts[0],
    last_name: parts[parts.length - 1],
  };
}

/**
 * Custom hook for managing onboarding wizard state and navigation
 * Handles multi-step form data, validation, and profile creation
 */
export function useOnboardingWizard(
  userId: string | undefined,
  displayName?: string | null
) {
  const { sessionId } = useSession();
  // Initialize data with parsed name from displayName if available
  const initialData = useMemo(() => {
    const parsedName = parseDisplayName(displayName);
    return {
      ...DEFAULT_DATA,
      ...parsedName,
    };
  }, [displayName]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Partial<Phase1ProfileInput>>(initialData);
  const startTimeRef = useRef<number>(Date.now());

  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);
  const completedRef = useRef(false);
  const stepRef = useRef(step);
  const progressRef = useRef(progress);

  // Keep refs in sync with current values
  useEffect(() => {
    stepRef.current = step;
    progressRef.current = progress;
  }, [step, progress]);

  // Clear error when step changes
  useEffect(() => {
    setError(null);
  }, [step]);

  // Update first_name and last_name from displayName if they're not already set
  // Only update fields that are actually missing to avoid infinite loops
  useEffect(() => {
    if (!displayName) return;

    const parsedName = parseDisplayName(displayName);
    const needsFirstName = !data.first_name && parsedName.first_name;
    const needsLastName = !data.last_name && parsedName.last_name;

    if (needsFirstName || needsLastName) {
      setData((prev) => ({
        ...prev,
        ...(needsFirstName && { first_name: parsedName.first_name }),
        ...(needsLastName && { last_name: parsedName.last_name }),
      }));
    }
  }, [displayName, data.first_name, data.last_name]);

  // Load Phase A data and pre-populate equipment selections
  useEffect(() => {
    const phaseAData = getPhaseAData();
    if (!phaseAData || !userId) return;

    let active = true;
    (async () => {
      try {
        // equipment_access is now string[] of category strings
        if (
          phaseAData.data.equipment_access &&
          Array.isArray(phaseAData.data.equipment_access) &&
          phaseAData.data.equipment_access.length > 0
        ) {
          // Validate categories against fitness level from Phase A
          const fitnessLevel = phaseAData.data.fitness_level;
          const validCategories = fitnessLevel
            ? validateCategories(phaseAData.data.equipment_access, fitnessLevel)
            : phaseAData.data.equipment_access;

          // Auto-map categories to equipment items
          const matchingItems =
            await EquipmentCategoryService.getEquipmentItemsByCategories(
              validCategories
            );
          const equipmentIds = matchingItems.map((item) => item.id);

          if (active) {
            setData((prev) => ({
              ...prev,
              equipment_access: validCategories, // Store categories directly (string[])
              available_equipment: equipmentIds, // Pre-selected equipment IDs
            }));
          }
        }
      } catch (error) {
        console.error("Failed to pre-populate equipment:", error);
        // Don't break the flow - user can still manually select equipment
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  // Track abandonment when component unmounts (user navigates away)
  useEffect(() => {
    const startTime = startTimeRef.current;
    return () => {
      // Only track abandonment if onboarding wasn't completed
      if (!completedRef.current && startTime) {
        onboardingAnalytics.trackAbandoned(
          "main",
          stepRef.current,
          progressRef.current,
          startTime
        );
      }
    };
  }, []);

  /**
   * Navigate to the next step
   */
  const next = () => {
    const fromStep = step;
    setStep((s) => {
      const nextStep = s + 1;
      const toStep = Math.min(TOTAL_STEPS, nextStep);
      onboardingAnalytics.trackStepNext(
        "main",
        fromStep,
        toStep,
        getMainStepName(fromStep)
      );
      return toStep;
    });
  };

  /**
   * Navigate to the previous step
   */
  const back = () => {
    const fromStep = step;
    setStep((s) => {
      const prevStep = Math.max(1, s - 1);
      onboardingAnalytics.trackStepBack(
        "main",
        fromStep,
        prevStep,
        getMainStepName(fromStep)
      );
      return prevStep;
    });
  };

  /**
   * Validate and complete the onboarding process
   */
  const handleComplete = async () => {
    if (!userId) {
      onboardingAnalytics.trackError(
        "main",
        "authentication",
        step,
        "Not authenticated"
      );
      setError("Not authenticated");
      return;
    }

    // Validate that equipment_access is set (can be empty array for bodyweight-only)
    if (!Array.isArray(data.equipment_access)) {
      onboardingAnalytics.trackError(
        "main",
        "validation",
        step,
        "Equipment categories not set"
      );
      setError("Please select equipment categories to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Validate all required fields are present before type assertion
      const requiredFields: (keyof Phase1ProfileInput)[] = [
        "first_name",
        "last_name",
        "age",
        "gender",
        "weight",
        "height",
        "preferred_units",
        "fitness_level",
        "current_activity_level",
        "fitness_goals",
        "injuries",
        "medical_conditions",
        "equipment_access",
        "available_equipment",
      ];

      const missingFields = requiredFields.filter(
        (field) => data[field] === undefined
      );

      if (missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(", ")}. Please go back and fill them.`;
        onboardingAnalytics.trackError(
          "main",
          "validation",
          step,
          errorMessage
        );
        setError(errorMessage);
        return;
      }

      // Ensure optional nullable fields are explicitly set to null if not provided
      // Create a new object to avoid mutating React state
      const dataWithNullableFields: Phase1ProfileInput = {
        ...(data as Phase1ProfileInput),
        injury_details: data.injury_details ?? null,
        medical_notes: data.medical_notes ?? null,
        // Phase 2 fields from steps 7-8 (optional)
        preferred_workout_duration: data.preferred_workout_duration ?? null,
        workout_frequency_per_week: data.workout_frequency_per_week ?? null,
        preferred_workout_times: data.preferred_workout_times ?? null,
        preferred_rest_between_sets: data.preferred_rest_between_sets ?? null,
        training_experience_years: data.training_experience_years ?? null,
        sports_background: data.sports_background ?? null,
        previous_training_programs: data.previous_training_programs ?? null,
      };

      await ProfileService.createUserProfile(userId, dataWithNullableFields);

      // Log onboarding completion activity
      logUserActivity(
        userId,
        "profile:onboarding_complete",
        "profile",
        userId,
        {
          completed_at: new Date().toISOString(),
        },
        sessionId || undefined
      ).catch(console.error);

      // Mark as completed to prevent abandonment tracking
      completedRef.current = true;

      // Track successful completion
      onboardingAnalytics.trackCompleted(
        "main",
        TOTAL_STEPS,
        startTimeRef.current,
        {
          has_injuries: (data.injuries?.length ?? 0) > 0,
          has_medical_conditions: (data.medical_conditions?.length ?? 0) > 0,
          equipment_access: Array.isArray(data.equipment_access)
            ? data.equipment_access.join(",")
            : "",
          fitness_level: data.fitness_level ?? "beginner",
        }
      );
    } catch (e: unknown) {
      // Handle Firestore errors with user-friendly messages
      let errorMessage = "Failed to save profile. Please try again.";
      let errorCode: string | undefined;

      if (e instanceof Error && "code" in e) {
        errorCode = (e as Error & { code?: string }).code;
        switch (errorCode) {
          case "permission-denied":
            errorMessage =
              "Permission denied. Please ensure you're signed in and try again.";
            break;
          case "unauthenticated":
            errorMessage = "Authentication required. Please sign in again.";
            break;
          case "unavailable":
            errorMessage =
              "Service temporarily unavailable. Please check your connection and try again.";
            break;
          case "failed-precondition":
            errorMessage =
              "Unable to save profile. Please refresh the page and try again.";
            break;
          case "resource-exhausted":
            errorMessage =
              "Service is busy. Please wait a moment and try again.";
            break;
          case "deadline-exceeded":
            errorMessage =
              "Request timed out. Please check your connection and try again.";
            break;
          default:
            // Use the error message if available, otherwise use generic message
            errorMessage = e.message || errorMessage;
        }
      } else if (e instanceof Error) {
        // For non-Firestore errors, use the error message
        errorMessage = e.message;
      }

      // Track save error
      onboardingAnalytics.trackError(
        "main",
        "save_failed",
        step,
        errorMessage,
        errorCode
      );

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    totalSteps: TOTAL_STEPS,
    progress,
    data,
    setData,
    error,
    submitting,
    next,
    back,
    handleComplete,
  };
}
