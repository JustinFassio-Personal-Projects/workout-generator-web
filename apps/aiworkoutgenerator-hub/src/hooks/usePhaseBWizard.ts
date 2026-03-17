import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ProfileService,
  type Phase1ProfileInput,
} from "@/services/profile/ProfileService";
import { getPhaseAData, clearPhaseAData } from "@/lib/phaseAStorage";
import type { WebsiteOnboardingData } from "@/types/websiteOnboarding";
import {
  onboardingAnalytics,
  getPhaseBStepName,
} from "@/lib/onboarding-analytics";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";

/**
 * Phase B data that needs to be collected in the app
 * (fields not collected on the website)
 */
export interface PhaseBData {
  first_name: string;
  last_name: string;
  age: number | null; // Collected if not provided in Phase A
  weight: number | null;
  height: number | null;
  injuries: string[];
  injury_details: string | null;
  medical_conditions: string[];
  medical_notes: string | null;
  available_equipment: string[];
}

const TOTAL_STEPS = 5; // Summary, Name, Body Stats, Safety, Equipment Items

const DEFAULT_PHASE_B_DATA: PhaseBData = {
  first_name: "",
  last_name: "",
  age: null,
  weight: null,
  height: null,
  injuries: [],
  injury_details: null,
  medical_conditions: [],
  medical_notes: null,
  available_equipment: [],
};

/**
 * Custom hook for managing Phase B onboarding wizard state and navigation.
 * This is a streamlined wizard for users coming from the website.
 *
 * @param userId - The authenticated user's ID
 */
export function usePhaseBWizard(userId: string | undefined) {
  const { sessionId } = useSession();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Phase A data from session storage (website form)
  const [phaseAData, setPhaseAData] = useState<WebsiteOnboardingData | null>(
    null
  );
  const [phaseASource, setPhaseASource] = useState<string>("website_builder");

  // Phase B data (app form)
  const [phaseBData, setPhaseBData] =
    useState<PhaseBData>(DEFAULT_PHASE_B_DATA);

  // Load Phase A data on mount
  useEffect(() => {
    const stored = getPhaseAData();
    if (stored) {
      setPhaseAData(stored.data);
      setPhaseASource(stored.source);
    }
  }, []);

  /**
   * Determine total steps based on equipment access
   * If equipment_access is empty array, we can skip the equipment items step
   */
  const effectiveTotalSteps = useMemo(() => {
    const equipmentAccess = phaseAData?.equipment_access;
    if (Array.isArray(equipmentAccess) && equipmentAccess.length === 0) {
      return TOTAL_STEPS - 1; // Skip equipment items step
    }
    return TOTAL_STEPS;
  }, [phaseAData?.equipment_access]);

  // Calculate progress based on effective total steps (not constant TOTAL_STEPS)
  const progress = useMemo(
    () => (step / effectiveTotalSteps) * 100,
    [step, effectiveTotalSteps]
  );
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

  // Track abandonment when component unmounts (user navigates away)
  useEffect(() => {
    const startTime = startTimeRef.current;
    return () => {
      // Only track abandonment if onboarding wasn't completed
      if (!completedRef.current && startTime) {
        onboardingAnalytics.trackAbandoned(
          "continue",
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
  const next = useCallback(() => {
    const fromStep = step;
    setStep((s) => {
      const nextStep = Math.min(effectiveTotalSteps, s + 1);
      onboardingAnalytics.trackStepNext(
        "continue",
        fromStep,
        nextStep,
        getPhaseBStepName(fromStep)
      );
      return nextStep;
    });
  }, [effectiveTotalSteps, step]);

  /**
   * Navigate to the previous step
   */
  const back = useCallback(() => {
    const fromStep = step;
    setStep((s) => {
      const prevStep = Math.max(1, s - 1);
      onboardingAnalytics.trackStepBack(
        "continue",
        fromStep,
        prevStep,
        getPhaseBStepName(fromStep)
      );
      return prevStep;
    });
  }, [step]);

  /**
   * Update Phase B data
   */
  const updatePhaseBData = useCallback((updates: Partial<PhaseBData>) => {
    setPhaseBData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Check if we should skip the equipment step
   */
  const shouldSkipEquipment = useMemo(() => {
    const equipmentAccess = phaseAData?.equipment_access;
    return Array.isArray(equipmentAccess) && equipmentAccess.length === 0;
  }, [phaseAData?.equipment_access]);

  /**
   * Validate and complete the onboarding process
   */
  const handleComplete = async () => {
    if (!userId) {
      onboardingAnalytics.trackError(
        "continue",
        "authentication",
        step,
        "Not authenticated"
      );
      setError("Not authenticated");
      return false;
    }

    if (!phaseAData) {
      onboardingAnalytics.trackError(
        "continue",
        "validation",
        step,
        "Missing workout preferences"
      );
      setError("Missing workout preferences. Please start over.");
      return false;
    }

    // Validate required Phase B fields
    if (!phaseBData.first_name.trim() || !phaseBData.last_name.trim()) {
      onboardingAnalytics.trackError(
        "continue",
        "validation",
        step,
        "Missing first or last name"
      );
      setError("Please provide your first and last name.");
      return false;
    }

    if (!phaseBData.weight || phaseBData.weight <= 0) {
      onboardingAnalytics.trackError(
        "continue",
        "validation",
        step,
        "Missing or invalid weight"
      );
      setError("Please provide your weight.");
      return false;
    }

    if (!phaseBData.height || phaseBData.height <= 0) {
      onboardingAnalytics.trackError(
        "continue",
        "validation",
        step,
        "Missing or invalid height"
      );
      setError("Please provide your height.");
      return false;
    }

    // Validate age: must be provided from Phase A or Phase B
    const finalAge = phaseAData.age ?? phaseBData.age;
    if (!finalAge || finalAge < 13 || finalAge > 120) {
      onboardingAnalytics.trackError(
        "continue",
        "validation",
        step,
        "Missing or invalid age"
      );
      setError("Please provide a valid age (13-120 years).");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Merge Phase A and Phase B data into complete profile
      const completeProfile: Phase1ProfileInput = {
        // Phase A data
        gender: phaseAData.gender ?? "prefer_not_to_say",
        age: finalAge, // Use age from Phase A or Phase B (validated above)
        preferred_units: phaseAData.preferred_units,
        fitness_level: phaseAData.fitness_level,
        current_activity_level: phaseAData.current_activity_level,
        fitness_goals: phaseAData.fitness_goals,
        equipment_access: phaseAData.equipment_access,

        // Phase B data
        first_name: phaseBData.first_name.trim(),
        last_name: phaseBData.last_name.trim(),
        weight: phaseBData.weight!,
        height: phaseBData.height!,
        injuries: phaseBData.injuries,
        injury_details: phaseBData.injury_details,
        medical_conditions: phaseBData.medical_conditions,
        medical_notes: phaseBData.medical_notes,
        available_equipment: phaseBData.available_equipment,
      };

      // Handle profile creation/update based on existing profile state
      const existingProfile = await ProfileService.getUserProfile(userId);

      if (existingProfile?.onboarding_completed) {
        // Edge case: User already completed onboarding but somehow reached Phase B wizard.
        // This shouldn't happen in normal flow (continue page redirects completed users),
        // but we handle it defensively by rejecting the operation.
        onboardingAnalytics.trackError(
          "continue",
          "validation",
          step,
          "Profile already completed"
        );
        setError(
          "Your profile is already complete. Redirecting to dashboard..."
        );
        return false;
      }

      if (existingProfile) {
        // Merge with existing incomplete profile.
        // This handles the case where a user started standard onboarding,
        // then later used the website builder flow, or has partial data
        // from a previous incomplete attempt.
        //
        // Merge strategy: new Phase A + Phase B data takes precedence over
        // any existing partial data, ensuring the most recent user inputs are saved.
        await ProfileService.updateUserProfile(userId, {
          ...existingProfile,
          ...completeProfile,
          onboarding_completed: true,
        });
      } else {
        // No existing profile - create a new one
        await ProfileService.createUserProfile(userId, completeProfile);
      }

      // Clear Phase A data from localStorage only after successful save
      clearPhaseAData();
      // This ensures data is preserved if save fails, allowing user to retry

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
        "continue",
        effectiveTotalSteps,
        startTimeRef.current,
        {
          has_injuries: phaseBData.injuries.length > 0,
          has_medical_conditions: phaseBData.medical_conditions.length > 0,
          equipment_access: phaseAData.equipment_access,
          fitness_level: phaseAData.fitness_level,
        }
      );

      // Success - caller should handle navigation
      return true;
    } catch (e: unknown) {
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
          default:
            errorMessage = e.message || errorMessage;
        }
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }

      // Track save error
      onboardingAnalytics.trackError(
        "continue",
        "save_failed",
        step,
        errorMessage,
        errorCode
      );

      setError(errorMessage);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // Step navigation
    step,
    totalSteps: effectiveTotalSteps,
    progress,
    next,
    back,

    // Phase A data (read-only, from website)
    phaseAData,
    phaseASource,

    // Phase B data (editable)
    phaseBData,
    updatePhaseBData,

    // Completion
    handleComplete,
    submitting,
    error,

    // Helpers
    shouldSkipEquipment,
  };
}
