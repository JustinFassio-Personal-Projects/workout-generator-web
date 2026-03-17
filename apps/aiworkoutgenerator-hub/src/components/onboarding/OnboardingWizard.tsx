"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/lib/auth";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";
import { StepBasicInfo } from "@/components/onboarding/steps/StepBasicInfo";
import { StepBodyStats } from "@/components/onboarding/steps/StepBodyStats";
import { StepFitness } from "@/components/onboarding/steps/StepFitness";
import { StepGoals } from "@/components/onboarding/steps/StepGoals";
import { StepSafety } from "@/components/onboarding/steps/StepSafety";
import { StepEquipment } from "@/components/onboarding/steps/StepEquipment";
import { StepTrainingPreferences } from "@/components/onboarding/steps/StepTrainingPreferences";
import { StepExperience } from "@/components/onboarding/steps/StepExperience";
import {
  onboardingAnalytics,
  getMainStepName,
} from "@/lib/onboarding-analytics";

/**
 * Multi-step onboarding wizard for collecting user profile information
 */
export function OnboardingWizard() {
  const { user } = useUser();
  const {
    step,
    totalSteps,
    progress,
    data,
    setData,
    error,
    submitting,
    next,
    back,
    handleComplete,
  } = useOnboardingWizard(user?.uid, user?.displayName ?? null);

  // Track step view when step changes
  // Only depend on step to avoid redundant tracking when progress recalculates
  useEffect(() => {
    if (step) {
      onboardingAnalytics.trackStepViewed(
        "main",
        step,
        getMainStepName(step),
        totalSteps,
        progress
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {step === 1 && (
        <StepBasicInfo value={data} onChange={setData} onNext={next} />
      )}
      {step === 2 && (
        <StepBodyStats
          value={data}
          onChange={setData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 3 && (
        <StepFitness
          value={data}
          onChange={setData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 4 && (
        <StepGoals
          value={data}
          onChange={setData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 5 && (
        <StepSafety
          value={data}
          onChange={setData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 6 && (
        <StepEquipment
          value={data}
          onChange={setData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 7 && (
        <StepTrainingPreferences
          value={data}
          onChange={setData}
          onNext={next}
          onBack={back}
        />
      )}
      {step === 8 && (
        <div className="space-y-6">
          <StepExperience value={data} onChange={setData} onBack={back} />

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={back}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleComplete}
              disabled={submitting || !data.equipment_access}
            >
              {submitting ? "Saving..." : "Finish"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
