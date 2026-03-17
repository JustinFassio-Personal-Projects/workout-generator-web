"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TypeSelectionStep } from "./TypeSelectionStep";
import { ImpactSelector } from "./ImpactSelector";
import { WorkoutFeedbackFlow } from "./flows/WorkoutFeedbackFlow";
import { BugReportFlow } from "./flows/BugReportFlow";
import { BillingFlow } from "./flows/BillingFlow";
import { FeatureIdeaFlow } from "./flows/FeatureIdeaFlow";
import { CoachingFlow } from "./flows/CoachingFlow";
import { QuestionFlow } from "./flows/QuestionFlow";
import { ContextPreview } from "./ContextPreview";
import type {
  SupportRequestType,
  SupportImpact,
  WorkoutFeedbackData,
  BugReportData,
  BillingData,
  FeatureIdeaData,
  CoachingData,
  QuestionData,
} from "@/types/support";
import { trackSupportStepCompleted } from "@/lib/analytics";
import { extractWorkoutContext } from "@/lib/support-utils";

// ============================================
// Types
// ============================================

interface WizardFormData {
  type?: SupportRequestType;
  impact?: SupportImpact;
  workoutFeedback?: WorkoutFeedbackData;
  bugReport?: BugReportData;
  billing?: BillingData;
  feature?: FeatureIdeaData;
  coaching?: CoachingData;
  question?: QuestionData;
}

interface SupportWizardProps {
  initialType?: SupportRequestType;
  initialWorkoutId?: string;
  formData: WizardFormData;
  onFormDataChange: (data: WizardFormData) => void;
  onSubmit: () => void;
  disabled?: boolean;
  onWorkoutContextChange?: (
    context: ReturnType<typeof extractWorkoutContext> | null
  ) => void;
}

// ============================================
// Component
// ============================================

export function SupportWizard({
  initialType,
  initialWorkoutId,
  formData,
  onFormDataChange,
  onSubmit,
  disabled,
  onWorkoutContextChange,
}: SupportWizardProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    // If initialType is provided, skip type selection
    if (initialType) {
      // If workout_feedback, skip impact step (go to step 2 which is workout selection)
      // For other types, also go to step 2 (impact selection)
      return 2;
    }
    return 1;
  });

  // Initialize form data if initial values provided (only on mount)
  useEffect(() => {
    // Use setTimeout to defer state updates (avoids setState in effect warning)
    const timeoutId = setTimeout(() => {
      // Combine both updates into a single call to avoid stale closure issues
      const updates: Partial<WizardFormData> = {};
      let needsUpdate = false;

      if (initialType && !formData.type) {
        updates.type = initialType;
        needsUpdate = true;
      }

      if (initialWorkoutId && !formData.workoutFeedback?.workoutId) {
        updates.workoutFeedback = {
          ...formData.workoutFeedback,
          workoutId: initialWorkoutId,
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        onFormDataChange({ ...formData, ...updates });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Dynamic total steps: 2 for workout_feedback (skip impact), 3 for others
  const totalSteps = formData.type === "workout_feedback" ? 2 : 3;

  const handleTypeSelect = (type: SupportRequestType) => {
    onFormDataChange({ ...formData, type });
    trackSupportStepCompleted(type, 1);
    setCurrentStep(2);
  };

  const handleImpactSelect = (impact: SupportImpact) => {
    onFormDataChange({ ...formData, impact });
    trackSupportStepCompleted(formData.type || "unknown", 2);
    // Delay navigation to allow visual feedback (pulse animation)
    // Total delay: 500ms (pulse start) + 600ms (pulse duration) = ~1100ms total
    setTimeout(() => {
      setCurrentStep(3);
    }, 1100);
  };

  const handleFlowDataChange = (
    data:
      | WorkoutFeedbackData
      | BugReportData
      | BillingData
      | FeatureIdeaData
      | CoachingData
      | QuestionData
  ) => {
    if (!formData.type) return;

    const update: WizardFormData = { ...formData };
    switch (formData.type) {
      case "workout_feedback":
        update.workoutFeedback = data as WorkoutFeedbackData;
        break;
      case "bug":
        update.bugReport = data as BugReportData;
        break;
      case "billing":
        update.billing = data as BillingData;
        break;
      case "feature":
        update.feature = data as FeatureIdeaData;
        break;
      case "coaching":
        update.coaching = data as CoachingData;
        break;
      case "question":
        update.question = data as QuestionData;
        break;
    }
    onFormDataChange(update);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      trackSupportStepCompleted(formData.type || "unknown", currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      trackSupportStepCompleted(formData.type || "unknown", currentStep + 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return !!formData.type;
    if (currentStep === 2) return !!formData.impact;
    if (currentStep === 3) {
      // Validate flow-specific data
      if (!formData.type) return false;
      switch (formData.type) {
        case "workout_feedback":
          return !!(
            formData.workoutFeedback?.intensity ||
            formData.workoutFeedback?.mismatchTags?.length
          );
        case "bug":
          return !!(
            formData.bugReport?.whatHappened &&
            formData.bugReport?.stepsToReproduce?.trim() &&
            formData.bugReport?.expectedVsActual?.trim()
          );
        case "billing":
          return (
            !!formData.billing?.description && !!formData.billing?.issueType
          );
        case "feature":
          return (
            !!formData.feature?.featureName && !!formData.feature?.whyHelpful
          );
        case "coaching":
          return !!(
            formData.coaching?.whatNeedHelpWith &&
            formData.coaching?.currentChallenges?.trim()
          );
        default:
          return false;
      }
    }
    return false;
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <TypeSelectionStep onSelect={handleTypeSelect} disabled={disabled} />
        )}

        {currentStep === 2 && formData.type === "workout_feedback" && (
          <WorkoutFeedbackFlow
            value={formData.workoutFeedback || {}}
            onChange={handleFlowDataChange}
            disabled={disabled}
            onWorkoutContextChange={onWorkoutContextChange}
            onSubmit={onSubmit}
          />
        )}

        {currentStep === 2 && formData.type !== "workout_feedback" && (
          <ImpactSelector
            value={formData.impact}
            onChange={handleImpactSelect}
            disabled={disabled}
          />
        )}

        {currentStep === 3 && formData.type && (
          <div className="space-y-4">
            {formData.type === "bug" && (
              <BugReportFlow
                value={
                  formData.bugReport || {
                    whatHappened: "",
                    stepsToReproduce: "",
                    expectedVsActual: "",
                  }
                }
                onChange={handleFlowDataChange}
                disabled={disabled}
              />
            )}
            {formData.type === "billing" && (
              <BillingFlow
                value={
                  formData.billing || {
                    issueType: "upgrade_downgrade",
                    description: "",
                  }
                }
                onChange={handleFlowDataChange}
                disabled={disabled}
              />
            )}
            {formData.type === "feature" && (
              <FeatureIdeaFlow
                value={formData.feature || { featureName: "", whyHelpful: "" }}
                onChange={handleFlowDataChange}
                disabled={disabled}
              />
            )}
            {formData.type === "coaching" && (
              <CoachingFlow
                value={
                  formData.coaching || {
                    whatNeedHelpWith: "",
                    currentChallenges: "",
                  }
                }
                onChange={handleFlowDataChange}
                disabled={disabled}
              />
            )}
            {formData.type === "question" && (
              <QuestionFlow
                value={formData.question || { topic: "", question: "" }}
                onChange={handleFlowDataChange}
                disabled={disabled}
              />
            )}
          </div>
        )}
      </div>

      {/* Context Preview */}
      {(currentStep === 3 ||
        (currentStep === 2 && formData.type === "workout_feedback")) && (
        <ContextPreview />
      )}

      {/* Navigation */}
      {/* For workout_feedback, navigation is handled by WorkoutFeedbackFlow component */}
      {formData.type !== "workout_feedback" && (
        <div className="flex justify-between gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || disabled}
          >
            Back
          </Button>
          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || disabled}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canProceed() || disabled}
            >
              Send to Justin
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
