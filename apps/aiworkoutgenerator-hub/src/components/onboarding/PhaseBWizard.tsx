"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/lib/auth";
import { usePhaseBWizard } from "@/hooks/usePhaseBWizard";
import { PlanBuilderSummary } from "@/components/onboarding/PlanBuilderSummary";
import { StepPhaseBName } from "@/components/onboarding/steps/StepPhaseBName";
import { StepPhaseBBodyStats } from "@/components/onboarding/steps/StepPhaseBBodyStats";
import { StepSafety } from "@/components/onboarding/steps/StepSafety";
import { StepPhaseBEquipmentContent } from "@/components/onboarding/steps/StepPhaseBEquipment";
import type { Phase1ProfileInput } from "@/services/profile/ProfileService";
import type { PhaseBData } from "@/hooks/usePhaseBWizard";
import type { WebsiteOnboardingData } from "@/types/websiteOnboarding";
import { toast } from "sonner";
import {
  onboardingAnalytics,
  getPhaseBStepName,
} from "@/lib/onboarding-analytics";

/**
 * Final equipment step with complete button instead of continue
 */
function StepPhaseBEquipmentFinal({
  value,
  phaseAData,
  onChange,
  onComplete,
  onBack,
  submitting,
}: {
  value: PhaseBData;
  phaseAData: WebsiteOnboardingData;
  onChange: (updates: Partial<PhaseBData>) => void;
  onComplete: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-6">
      <StepPhaseBEquipmentContent
        value={value}
        phaseAData={phaseAData}
        onChange={onChange}
      />
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onComplete} disabled={submitting}>
          {submitting ? "Saving..." : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Phase B Onboarding Wizard
 *
 * A streamlined onboarding wizard for users coming from the website.
 * Collects only the fields not gathered in Phase A (website form).
 *
 * Steps:
 * 1. Summary (Phase A data - read-only)
 * 2. Name (first_name, last_name)
 * 3. Body Stats (weight, height)
 * 4. Safety (injuries, medical conditions)
 * 5. Equipment Items (if equipment_access is not 'none')
 */
export function PhaseBWizard() {
  const { user } = useUser();
  const router = useRouter();
  const {
    step,
    totalSteps,
    progress,
    next,
    back,
    phaseAData,
    phaseBData,
    updatePhaseBData,
    handleComplete,
    submitting,
    error,
    shouldSkipEquipment,
  } = usePhaseBWizard(user?.uid);

  // Track step view when step changes
  // Only depend on step to avoid redundant tracking when progress recalculates
  useEffect(() => {
    if (step) {
      onboardingAnalytics.trackStepViewed(
        "continue",
        step,
        getPhaseBStepName(step),
        totalSteps,
        progress
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Handle final step completion
  const onComplete = async () => {
    const success = await handleComplete();
    if (success) {
      toast.success("Profile saved!", {
        description:
          "Let's complete your daily check-in to personalize your first workout.",
      });
      // Redirect to daily check-in with source indicator
      router.push("/daily-checkin?from=signup");
    }
  };

  // If no Phase A data, something went wrong
  if (!phaseAData) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <h3 className="font-medium text-destructive">
            Missing workout preferences
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your workout preferences weren&apos;t found. Please start over from
            the website.
          </p>
        </div>
        <Button onClick={() => router.push("/onboarding")} variant="outline">
          Start standard onboarding instead
        </Button>
      </div>
    );
  }

  // Convert phaseBData to the format StepSafety expects
  const safetyValue: Partial<Phase1ProfileInput> = {
    injuries: phaseBData.injuries,
    injury_details: phaseBData.injury_details,
    medical_conditions: phaseBData.medical_conditions,
    medical_notes: phaseBData.medical_notes,
  };

  const handleSafetyChange = (next: Partial<Phase1ProfileInput>) => {
    updatePhaseBData({
      injuries: next.injuries ?? [],
      injury_details: next.injury_details ?? null,
      medical_conditions: next.medical_conditions ?? [],
      medical_notes: next.medical_notes ?? null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step} of {totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Step 1: Summary */}
      {step === 1 && (
        <div className="space-y-6">
          <PlanBuilderSummary data={phaseAData} />
          <div className="flex justify-end">
            <Button type="button" onClick={next}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Name */}
      {step === 2 && (
        <StepPhaseBName
          value={phaseBData}
          onChange={updatePhaseBData}
          onNext={next}
          onBack={back}
        />
      )}

      {/* Step 3: Body Stats */}
      {step === 3 && (
        <StepPhaseBBodyStats
          value={phaseBData}
          phaseAData={phaseAData}
          onChange={updatePhaseBData}
          onNext={next}
          onBack={back}
        />
      )}

      {/* Step 4: Safety */}
      {step === 4 && (
        <StepSafety
          value={safetyValue}
          onChange={handleSafetyChange}
          onNext={shouldSkipEquipment ? onComplete : next}
          onBack={back}
        />
      )}

      {/* Step 5: Equipment Items (skipped if equipment_access is 'none') */}
      {step === 5 && !shouldSkipEquipment && (
        <StepPhaseBEquipmentFinal
          value={phaseBData}
          phaseAData={phaseAData}
          onChange={updatePhaseBData}
          onComplete={onComplete}
          onBack={back}
          submitting={submitting}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
