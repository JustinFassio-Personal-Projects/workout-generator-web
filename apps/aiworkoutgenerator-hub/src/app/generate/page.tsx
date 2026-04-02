"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, ArrowLeft, Clock, Plus, RefreshCw } from "lucide-react";

import { useUser } from "@/lib/auth";
import { useOnboardingStatus, useUserProfile } from "@/hooks/useUserProfile";
import { useUserDailyState } from "@/hooks/useUserDailyState";
import { useTrainers, useRecommendedTrainer } from "@/hooks/useTrainers";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useWorkoutSummaries,
  type WorkoutSummariesFilters,
} from "@/hooks/useWorkoutSummaries";
import { useSession } from "@/lib/session-tracker";
import { devLogError } from "@/lib/devLog";
import { logUserActivity } from "@/lib/user-activity-logger";
import { setGenerationIdForWorkout } from "@/lib/workout-generation-analytics-storage";
import { WORKOUT_LIMITS } from "@/lib/subscription-constants";
import {
  TrainerService,
  isReverseTrialAiBlockedError,
} from "@/services/trainer/TrainerService";
import { TrainerEquipmentService } from "@/services/trainer/TrainerEquipmentService";
import { WaiverService } from "@/services/waiver";
import { DEFAULT_WAIVER_TEXT } from "@/lib/waiver/default-waiver-text";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import { AppPageHeader } from "@/components/app";
import { EquipmentSelector } from "@/components/shared/EquipmentSelector";
import {
  TrainerSelection,
  FocusBox,
  WorkoutIterationSelection,
} from "@/components/generate";
import { useUpgradeModal } from "@/components/upgrade";
import { useReverseTrialCapabilities } from "@/components/reverse-trial/ReverseTrialCapabilitiesContext";
import { trackFeatureLockClick } from "@/lib/reverse-trial-funnel-analytics";
import { LiabilityWaiver } from "@/components/waiver";
import type { LiabilityWaiver as LiabilityWaiverType } from "@/types/firestore";
import type { TrainerId, Trainer } from "@/types/trainer";
import type { OverloadProtocol } from "@/types/overloadProtocol";
import type { WorkoutSummary } from "@/types/workoutSummary";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90] as const;

type GenerateMode = "new" | "iterate";
type GenerateStep =
  | "mode"
  | "trainer"
  | "iteration"
  | "focus"
  | "waiver"
  | "equipment"
  | "generating";

/**
 * Fallback waiver used when the API fails or returns null.
 * Allows users to read and fill out the waiver; agreement may succeed if server has matching default.
 */
function createFallbackWaiver(): LiabilityWaiverType {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "fallback",
    version: "1.0.0",
    version_hash: "",
    title: "Liability Waiver and Terms of Service",
    content: DEFAULT_WAIVER_TEXT,
    is_active: true,
    created_by: "system",
    created_at: { seconds: now } as LiabilityWaiverType["created_at"],
    updated_at: { seconds: now } as LiabilityWaiverType["updated_at"],
    effective_date: { seconds: now } as LiabilityWaiverType["effective_date"],
  };
}

function GenerateWorkoutPageContent() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const { profile } = useUserProfile();
  const { data: dailyState, loading: dailyLoading } = useUserDailyState();
  const { trainers, loading: trainersLoading } = useTrainers();
  const {
    canGenerate,
    remainingWorkouts,
    workoutsThisMonth,
    limitPeriod,
    tier,
    refreshWorkoutCount,
  } = useSubscription();
  const { sessionId } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generation mode state
  const [generationMode, setGenerationMode] = useState<GenerateMode>("new");
  const [step, setStep] = useState<GenerateStep>("mode");

  // Preloaded summary when opening via /generate?iterate=<summaryId> (quick iterate from history)
  const [preloadedSummary, setPreloadedSummary] =
    useState<WorkoutSummary | null>(null);

  // Trainer-first flow state (for "new" mode)
  const [selectedTrainerId, setSelectedTrainerId] = useState<TrainerId | null>(
    null
  );
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);

  // Iteration flow state (for "iterate" mode)
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(
    null
  );
  const [selectedProtocol, setSelectedProtocol] =
    useState<OverloadProtocol | null>(null);
  const [summaryFilters, setSummaryFilters] = useState<WorkoutSummariesFilters>(
    {}
  );

  // Fetch workout summaries for iteration mode (also when landing with ?iterate= to preload list)
  const iterateParam = searchParams.get("iterate");
  const {
    summaries,
    loading: summariesLoading,
    error: summariesError,
    refresh: refreshSummaries,
  } = useWorkoutSummaries(user?.uid, {
    enabled: generationMode === "iterate" || Boolean(iterateParam),
    ...summaryFilters,
  });

  // Waiver state
  const [waiver, setWaiver] = useState<LiabilityWaiverType | null>(null);
  const [hasAgreedToWaiver, setHasAgreedToWaiver] = useState<boolean | null>(
    null
  );
  const [waiverLoading, setWaiverLoading] = useState(true);
  const [waiverFetchError, setWaiverFetchError] = useState<boolean>(false);
  const [waiverRetryCount, setWaiverRetryCount] = useState(0);

  // Upgrade modal
  const { showUpgradeModal, showPricingModal } = useUpgradeModal();
  const { capabilities: reverseCap } = useReverseTrialCapabilities();
  const reverseTrialAiLocked = Boolean(
    reverseCap?.enforcement_enabled && reverseCap.can_use_ai === false
  );

  // Workout settings
  const [submitting, setSubmitting] = useState(false);
  const [duration, setDuration] = useState<number>(45);
  const [workoutEquipmentCategories, setWorkoutEquipmentCategories] = useState<
    string[]
  >([]);
  const [workoutAvailableEquipment, setWorkoutAvailableEquipment] = useState<
    string[]
  >([]);
  const [selectedModel, setSelectedModel] = useState<string>(
    "googleai/gemini-2.0-flash"
  );

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track last computed trainer/focus combination to avoid unnecessary re-computation
  const lastComputedEquipmentRef = useRef<{
    trainerId: TrainerId | null;
    focusId: string | null;
  } | null>(null);

  // Get recommended trainer based on user's fitness goals
  const { recommendedTrainerId } = useRecommendedTrainer(
    profile?.fitness_goals ?? [],
    trainers
  );

  // Get selected trainer object
  const selectedTrainer: Trainer | null = useMemo(() => {
    if (!selectedTrainerId) return null;
    return trainers.find((t) => t.id === selectedTrainerId) ?? null;
  }, [selectedTrainerId, trainers]);

  const missingDailyState = useMemo(
    () => !dailyLoading && !dailyState,
    [dailyLoading, dailyState]
  );

  // Initialize equipment from profile (use defaults if profile not available)
  useEffect(() => {
    if (profile) {
      // equipment_access is now string[] of categories
      setWorkoutEquipmentCategories(
        Array.isArray(profile.equipment_access) ? profile.equipment_access : []
      );
      setWorkoutAvailableEquipment(profile.available_equipment);
    } else if (!profileLoading) {
      setWorkoutEquipmentCategories([]);
      setWorkoutAvailableEquipment([]);
    }
  }, [profile, profileLoading]);

  // Compute intersection of user's equipment and trainer's equipment set when trainer/focus changes
  // This pre-selects only equipment the user has that's also in the trainer's set
  useEffect(() => {
    // Only run when trainer is selected and we have user equipment and are on equipment step
    if (
      !selectedTrainerId ||
      !profile?.available_equipment ||
      step !== "equipment"
    ) {
      return;
    }

    // Check if we've already computed for this trainer/focus combination
    const lastComputed = lastComputedEquipmentRef.current;
    const needsComputation =
      !lastComputed ||
      lastComputed.trainerId !== selectedTrainerId ||
      lastComputed.focusId !== selectedFocusId;

    // Skip if already computed for this combination (prevents unnecessary re-fetch on step re-entry)
    if (!needsComputation) {
      return;
    }

    let active = true;
    (async () => {
      try {
        // Fetch trainer's equipment set
        const trainerEquipment =
          await TrainerEquipmentService.getFilteredEquipmentForTrainer(
            selectedTrainerId,
            selectedFocusId
          );
        const trainerEquipmentIds = new Set(
          trainerEquipment.map((item: { id: string }) => item.id)
        );
        // Ensure available_equipment is always an array (handle legacy non-array values)
        const userEquipmentIds = Array.isArray(profile.available_equipment)
          ? profile.available_equipment
          : [];

        // Compute intersection: items user has AND are in trainer's set
        const intersection = userEquipmentIds.filter((id) =>
          trainerEquipmentIds.has(id)
        );

        if (active) {
          // Update ref to track this computation
          lastComputedEquipmentRef.current = {
            trainerId: selectedTrainerId,
            focusId: selectedFocusId,
          };
          // Pre-select only the intersection
          setWorkoutAvailableEquipment(intersection);
        }
      } catch {
        // On error, fall back to user's full equipment list (ensure it's an array)
        if (active && profile.available_equipment) {
          const fallbackEquipment = Array.isArray(profile.available_equipment)
            ? profile.available_equipment
            : [];
          setWorkoutAvailableEquipment(fallbackEquipment);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedTrainerId, selectedFocusId, profile?.available_equipment, step]);

  // Quick iterate from history: when landing with ?iterate=<summaryId>, set mode and pre-select
  useEffect(() => {
    if (!iterateParam?.trim()) return;
    setGenerationMode("iterate");
    setStep("iteration");
    setSelectedSummaryId(iterateParam);
    refreshSummaries();
  }, [iterateParam, refreshSummaries]);

  // When pre-selecting by iterate param, ensure that summary is in the list (fetch if not in first page)
  useEffect(() => {
    if (!iterateParam || !user?.uid || summariesLoading) return;
    if (summaries.some((s) => s.id === iterateParam)) {
      setPreloadedSummary(null);
      return;
    }
    let cancelled = false;
    WorkoutSummaryService.getSummary(iterateParam).then((summary) => {
      if (cancelled || !summary || summary.user_id !== user.uid) return;
      setPreloadedSummary(summary);
    });
    return () => {
      cancelled = true;
    };
  }, [iterateParam, user?.uid, summaries, summariesLoading]);

  // Cleanup: mark component as unmounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-open upgrade/pricing modal when workout limit is reached (tier-aware: free → upgrade modal, basic/pro → full pricing)
  useEffect(() => {
    if (!canGenerate && remainingWorkouts === 0) {
      if (tier === "basic" || tier === "pro") {
        showPricingModal();
      } else {
        showUpgradeModal("workout_limit");
      }
    }
  }, [
    canGenerate,
    remainingWorkouts,
    tier,
    showUpgradeModal,
    showPricingModal,
  ]);

  // Check waiver agreement status
  useEffect(() => {
    if (!user || authLoading) return;

    const checkWaiver = async () => {
      setWaiverLoading(true);
      setWaiverFetchError(false);
      try {
        const activeWaiver = await WaiverService.getActiveWaiver();
        setWaiver(activeWaiver);

        if (activeWaiver) {
          const hasAgreed = await WaiverService.hasUserAgreed(user.uid);
          setHasAgreedToWaiver(hasAgreed);
        } else {
          // No active waiver - use fallback so user can still read and attempt to agree
          setWaiver(createFallbackWaiver());
          setHasAgreedToWaiver(false);
        }
      } catch (error) {
        console.error("Failed to check waiver status:", error);
        // On fetch error, use fallback so user can at least read and fill out the waiver
        setWaiver(createFallbackWaiver());
        setHasAgreedToWaiver(false);
        setWaiverFetchError(true);
      } finally {
        setWaiverLoading(false);
      }
    };

    checkWaiver();
  }, [user, authLoading, waiverRetryCount]);

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  // Handle mode selection
  const handleModeSelect = (mode: GenerateMode) => {
    setGenerationMode(mode);
    if (mode === "new") {
      setStep("trainer");
    } else {
      setStep("iteration");
    }
  };

  // Handle trainer selection
  const handleTrainerSelect = (trainerId: TrainerId) => {
    setSelectedTrainerId(trainerId);
    setSelectedFocusId(null); // Reset focus when trainer changes
    setStep("focus");
  };

  // Handle iteration selection continue
  const handleIterationContinue = () => {
    if (!selectedSummaryId || !selectedProtocol) {
      toast.error("Please select a workout and protocol");
      return;
    }

    // Get the selected summary to find trainer info
    const selectedSummary = summaries.find((s) => s.id === selectedSummaryId);
    if (selectedSummary) {
      // Find trainer by name from the summary
      const matchingTrainer = trainers.find(
        (t) => t.name === selectedSummary.trainer_name
      );
      if (matchingTrainer) {
        setSelectedTrainerId(matchingTrainer.id as TrainerId);
        // Set the focus from the previous workout
        if (selectedSummary.focus) {
          const matchingFocus = matchingTrainer.focuses.find(
            (f) => f.name.toLowerCase() === selectedSummary.focus?.toLowerCase()
          );
          if (matchingFocus) {
            setSelectedFocusId(matchingFocus.id);
          }
        }
      }
    }

    // Check waiver status
    if (!hasAgreedToWaiver) {
      setStep("waiver");
    } else {
      setStep("equipment");
    }
  };

  // Handle focus selection and continue
  const handleFocusContinue = () => {
    // Check if waiver agreement is required
    // Proceed to waiver step to show waiver form (or error state if no waiver configured)
    if (!hasAgreedToWaiver) {
      setStep("waiver");
    } else {
      setStep("equipment");
    }
  };

  // Handle going back
  const handleBack = () => {
    if (step === "trainer") {
      setStep("mode");
      setSelectedTrainerId(null);
    } else if (step === "iteration") {
      setStep("mode");
      setSelectedSummaryId(null);
      setSelectedProtocol(null);
    } else if (step === "focus") {
      setStep("trainer");
      setSelectedTrainerId(null);
    } else if (step === "waiver") {
      if (generationMode === "iterate") {
        setStep("iteration");
      } else {
        setStep("focus");
      }
    } else if (step === "equipment") {
      // Go back to waiver if required, otherwise to focus/iteration
      if (waiver && !hasAgreedToWaiver) {
        setStep("waiver");
      } else if (generationMode === "iterate") {
        setStep("iteration");
      } else {
        setStep("focus");
      }
    }
  };

  // Handle waiver agreement
  const handleWaiverAgree = async () => {
    // Refresh waiver agreement status
    if (user) {
      try {
        const hasAgreed = await WaiverService.hasUserAgreed(user.uid);
        setHasAgreedToWaiver(hasAgreed);
        if (hasAgreed) {
          setStep("equipment");
        }
      } catch (error) {
        console.error("Failed to refresh waiver status:", error);
        toast.error("Failed to verify waiver agreement");
      }
    }
  };

  // Handle workout generation
  const handleGenerate = async () => {
    // Validate trainer is selected (either explicitly or from iteration source)
    if (!selectedTrainerId && generationMode === "new") {
      toast.error("Please select a trainer first");
      return;
    }

    // For iteration mode, validate summary and protocol
    if (generationMode === "iterate") {
      if (!selectedSummaryId || !selectedProtocol) {
        toast.error("Please select a workout and protocol for iteration");
        return;
      }
    }

    // Check workout limit before making API call (defense in depth)
    if (!canGenerate) {
      toast.error(
        limitPeriod === "total"
          ? `You've used all ${WORKOUT_LIMITS.free} free workouts (lifetime limit). Upgrade to continue.`
          : `You've reached your workout limit (${workoutsThisMonth} used this month). Upgrade for more.`,
        { duration: 5000 }
      );
      return;
    }

    // Validate waiver before generating (defense in depth - matches backend validation)
    if (!waiver) {
      toast.error(
        "Liability waiver not loaded. Please refresh the page and try again.",
        { duration: 5000 }
      );
      return;
    }

    if (!hasAgreedToWaiver) {
      toast.error(
        "You must agree to the liability waiver before generating a workout.",
        { duration: 5000 }
      );
      setStep("waiver");
      return;
    }

    if (reverseTrialAiLocked) {
      trackFeatureLockClick("generate_page", {
        firebaseUid: user?.uid ?? null,
        capabilities: reverseCap,
      });
      toast.error(
        "Your Pro trial has ended. Subscribe to Premium to generate new AI workouts.",
        { duration: 6000 }
      );
      showUpgradeModal(
        reverseCap?.ended_reason === "churned"
          ? "churned_winback"
          : "reverse_trial_ai"
      );
      return;
    }

    setSubmitting(true);
    setStep("generating");

    try {
      // Find the focus name if a specific focus was selected
      const focusName = selectedFocusId
        ? (selectedTrainer?.focuses.find((f) => f.id === selectedFocusId)
            ?.name ?? null)
        : null;

      // For iteration mode, get focus from the selected summary
      let iterationFocusName = focusName;
      if (generationMode === "iterate" && selectedSummaryId) {
        const selectedSummary = summaries.find(
          (s) => s.id === selectedSummaryId
        );
        if (selectedSummary?.focus) {
          iterationFocusName = selectedSummary.focus;
        }
      }

      // Determine trainer ID - for iteration, try to match from summary
      let effectiveTrainerId = selectedTrainerId;
      if (generationMode === "iterate" && !effectiveTrainerId) {
        const selectedSummary = summaries.find(
          (s) => s.id === selectedSummaryId
        );
        const matchingTrainer = trainers.find(
          (t) => t.name === selectedSummary?.trainer_name
        );
        if (matchingTrainer) {
          effectiveTrainerId = matchingTrainer.id as TrainerId;
        } else {
          // Fallback to first trainer if no match
          effectiveTrainerId = (trainers[0]?.id as TrainerId) ?? "marcus_chen";
        }
      }

      const workoutId = await TrainerService.generateWorkout({
        trainerId: effectiveTrainerId!,
        focus: generationMode === "iterate" ? iterationFocusName : focusName,
        duration_minutes: duration,
        equipment_access:
          workoutEquipmentCategories.length > 0
            ? workoutEquipmentCategories
            : undefined,
        available_equipment:
          workoutAvailableEquipment !== null
            ? workoutAvailableEquipment
            : undefined,
        model: selectedModel,
        // Iteration parameters
        ...(generationMode === "iterate" &&
          selectedSummaryId &&
          selectedProtocol && {
            iteration_source_summary_id: selectedSummaryId,
            overload_protocol: selectedProtocol,
          }),
      });

      if (isMountedRef.current) {
        const generationId = crypto.randomUUID();
        setGenerationIdForWorkout(workoutId, generationId);
        // Log activity after successful generation
        if (user) {
          void logUserActivity(
            user.uid,
            "workout:generate",
            "workout",
            workoutId,
            {
              trainer_id: selectedTrainerId,
              focus: focusName,
              duration_minutes: duration,
              model: selectedModel,
              equipment_categories:
                workoutEquipmentCategories.length > 0
                  ? workoutEquipmentCategories
                  : undefined,
            },
            {
              sessionId: sessionId || undefined,
              generationId,
            }
          ).then((persisted) => {
            // logUserActivity swallows errors and returns false; it does not reject in normal paths.
            if (!persisted) {
              devLogError(
                "GenerateWorkoutPage.logUserActivity",
                new Error("workout:generate not persisted")
              );
            }
          });
        }

        // Refresh workout count to reflect the new workout
        refreshWorkoutCount();
        toast.success("Workout generated successfully!");
        router.push(
          `/workouts?id=${encodeURIComponent(workoutId)}&from=generate`
        );
      }
    } catch (err) {
      if (isMountedRef.current) {
        // Refresh count in case it's out of sync (helps debug limit issues)
        refreshWorkoutCount();

        if (isReverseTrialAiBlockedError(err)) {
          showUpgradeModal(
            reverseCap?.ended_reason === "churned"
              ? "churned_winback"
              : "reverse_trial_ai"
          );
          toast.error(
            err instanceof Error
              ? err.message
              : "Your trial period has ended. Upgrade to continue.",
            { duration: 8000 }
          );
          setStep("equipment");
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate workout";

        // Extract actionable guidance if available
        interface ErrorWithMetadata extends Error {
          actionable?: string;
          retryable?: boolean;
        }
        const errorWithMetadata = err as ErrorWithMetadata;
        const actionable = errorWithMetadata?.actionable;
        const retryable = errorWithMetadata?.retryable ?? false;

        // Check if it's a rate limit error that might be transient
        const isTransientRateLimit =
          errorMessage.includes("AI service") ||
          errorMessage.includes("temporarily at capacity") ||
          errorMessage.includes("wait a few minutes") ||
          errorMessage.includes("rate limit");

        // Build description with actionable guidance
        let description: string | undefined;
        if (actionable) {
          description = actionable;
        } else if (isTransientRateLimit || retryable) {
          description =
            "This is usually temporary. You can try again in a few minutes, or try selecting a different AI model.";
        }

        // Show error with appropriate duration and description
        if (isTransientRateLimit || retryable) {
          toast.error(errorMessage, {
            duration: 10000,
            description,
          });
        } else {
          toast.error(errorMessage, {
            duration: 8000,
            description,
          });
        }

        setStep("equipment");
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (authLoading || profileLoading || waiverLoading) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !completed) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      {/* Top Navigation: "Back to Dashboard" exits flow; step "Back" goes to previous step (trainer → focus → waiver → equipment). Both intentional. */}
      <AppPageHeader backHref="/dashboard" backLabel="Back to Dashboard">
        {step !== "trainer" && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
      </AppPageHeader>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Generate Workout</h1>
            <p className="text-muted-foreground mt-2">
              Choose your AI trainer and let them create a personalized workout
              based on your profile and daily check-in.
            </p>
          </div>
          {/* Workout Usage Indicator */}
          {remainingWorkouts !== null && (
            <div className="flex-shrink-0 text-right">
              <div className="text-sm text-muted-foreground">
                {tier === "free" ? "Free workouts" : "Workouts"} remaining
              </div>
              <div className="flex items-center justify-end gap-2">
                {remainingWorkouts <= 2 && (
                  <>
                    <span className="sr-only">
                      {remainingWorkouts === 0
                        ? "No workouts remaining"
                        : "Low number of workouts remaining"}
                    </span>
                    <AlertCircle
                      className={`h-4 w-4 ${
                        remainingWorkouts === 0
                          ? "text-destructive"
                          : "text-amber-600"
                      }`}
                      aria-hidden="true"
                    />
                  </>
                )}
                <span
                  className={`text-2xl font-bold ${
                    remainingWorkouts === 0
                      ? "text-destructive"
                      : remainingWorkouts <= 2
                        ? "text-amber-600"
                        : ""
                  }`}
                >
                  {remainingWorkouts}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {workoutsThisMonth} used {limitPeriod}
              </div>
            </div>
          )}
        </div>

        {/* Workout Limit Warning */}
        {!canGenerate && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Workout Limit Reached
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {limitPeriod === "total"
                  ? `You've used all ${WORKOUT_LIMITS.free} free workouts (lifetime limit). Upgrade to continue generating workouts.`
                  : "You've reached your monthly workout limit. Upgrade for more workouts."}
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => showUpgradeModal("workout_limit")}
              >
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Daily Check-In Warning */}
        {missingDailyState && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Complete today&apos;s Daily Check-In
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Add a check-in so your workout matches how you feel today.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/daily-checkin">Go to Check-In</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 0: Mode Selection */}
        {step === "mode" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Plus className="w-5 h-5" />
              <span>How would you like to generate your workout?</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose to create a fresh workout or build on a previous session.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* New Workout Option */}
              <button
                type="button"
                onClick={() => handleModeSelect("new")}
                className="relative flex flex-col items-start p-6 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all duration-200 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">New Workout</h3>
                <p className="text-sm text-muted-foreground">
                  Start fresh with a trainer and focus of your choice
                </p>
              </button>

              {/* Iterate Previous Option */}
              <button
                type="button"
                onClick={() => handleModeSelect("iterate")}
                className="relative flex flex-col items-start p-6 rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition-all duration-200 text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                  <RefreshCw className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Iterate Previous</h3>
                <p className="text-sm text-muted-foreground">
                  Progress from a completed workout using an overload protocol
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 1a: Trainer Selection (for new workout mode) */}
        {step === "trainer" && (
          <TrainerSelection
            trainers={trainers}
            selectedTrainerId={selectedTrainerId}
            recommendedTrainerId={recommendedTrainerId}
            loading={trainersLoading}
            onSelect={handleTrainerSelect}
          />
        )}

        {/* Step 1b: Iteration Selection (for iterate mode) */}
        {step === "iteration" && (
          <WorkoutIterationSelection
            summaries={
              preloadedSummary &&
              !summaries.some((s) => s.id === preloadedSummary.id)
                ? [preloadedSummary, ...summaries]
                : summaries
            }
            loading={summariesLoading}
            error={summariesError}
            onRefresh={refreshSummaries}
            selectedSummaryId={selectedSummaryId}
            selectedProtocol={selectedProtocol}
            onSelectSummary={setSelectedSummaryId}
            onSelectProtocol={setSelectedProtocol}
            onContinue={handleIterationContinue}
            fitnessGoals={profile?.fitness_goals ?? []}
            filters={summaryFilters}
            onFiltersChange={setSummaryFilters}
          />
        )}

        {/* Step 2: Focus Selection */}
        {step === "focus" && selectedTrainer && (
          <FocusBox
            trainer={selectedTrainer}
            selectedFocusId={selectedFocusId}
            onSelectFocus={setSelectedFocusId}
            onContinue={handleFocusContinue}
          />
        )}

        {/* Step 3: Waiver Agreement */}
        {step === "waiver" && (
          <div className="space-y-4">
            {waiverFetchError && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <span className="text-amber-700 dark:text-amber-400">
                  Could not load the latest waiver from the server. Showing
                  offline copy.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWaiverRetryCount((c) => c + 1)}
                  disabled={waiverLoading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${waiverLoading ? "animate-spin" : ""}`}
                  />
                  Retry
                </Button>
              </div>
            )}
            {waiver ? (
              <LiabilityWaiver
                waiver={waiver}
                onAgree={handleWaiverAgree}
                loading={waiverLoading}
                userFullName={
                  profile ? `${profile.first_name} ${profile.last_name}` : ""
                }
                user={user}
              />
            ) : (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Loading Liability Waiver
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The liability waiver is being prepared. This may take a
                    moment on first use.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If this persists, please try refreshing the page or contact
                    support.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Equipment & Duration */}
        {step === "equipment" && selectedTrainer && (
          <div className="space-y-6">
            {reverseTrialAiLocked ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>AI generation locked</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    New AI workouts need Premium after your Pro trial. You can
                    still open workouts you already created from your library.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      trackFeatureLockClick("generate_page", {
                        firebaseUid: user?.uid ?? null,
                        capabilities: reverseCap,
                      });
                      showUpgradeModal(
                        reverseCap?.ended_reason === "churned"
                          ? "churned_winback"
                          : "reverse_trial_ai"
                      );
                    }}
                  >
                    View Premium
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {/* Selected Trainer Summary */}
            <Card className={selectedTrainer.accentColor}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 overflow-hidden ${selectedTrainer.accentColor} ${selectedTrainer.borderColor}`}
                  >
                    {selectedTrainer.imageUrl ? (
                      <Image
                        src={selectedTrainer.imageUrl}
                        alt={selectedTrainer.name}
                        width={40}
                        height={40}
                        className="w-full h-full rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-foreground/80">
                        {selectedTrainer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{selectedTrainer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedFocusId
                        ? selectedTrainer.focuses.find(
                            (f) => f.id === selectedFocusId
                          )?.name
                        : `Blending: ${selectedTrainer.focuses.map((f) => f.name).join(", ")}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duration Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Workout Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Select
                    value={String(duration)}
                    onValueChange={(v) => setDuration(Number(v))}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle>AI Model (Optional)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Switch models if you encounter rate limit errors. Default is
                  recommended for most users.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger id="model" className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="googleai/gemini-2.0-flash">
                        Gemini 2.0 Flash (Default - Fast)
                      </SelectItem>
                      <SelectItem value="googleai/gemini-3-pro">
                        Gemini 3 Pro (Higher Quality)
                      </SelectItem>
                      <SelectItem value="googleai/gemini-2.5-flash">
                        Gemini 2.5 Flash
                      </SelectItem>
                      <SelectItem value="googleai/gemini-2.5-flash-lite">
                        Gemini 2.5 Flash Lite
                      </SelectItem>
                      <SelectItem value="googleai/gemini-3-flash">
                        Gemini 3 Flash
                      </SelectItem>
                      <SelectItem value="googleai/gemini-2.5-pro">
                        Gemini 2.5 Pro
                      </SelectItem>
                      <SelectItem value="googleai/gemini-1.5-flash">
                        Gemini 1.5 Flash (Fallback)
                      </SelectItem>
                      <SelectItem value="googleai/gemini-2.0-flash-exp">
                        Gemini 2.0 Flash Exp (Experimental)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Selection */}
            {!profileLoading && (
              <Card>
                <CardHeader>
                  <CardTitle>Equipment for this workout</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Override your profile equipment settings for this specific
                    workout.
                  </p>
                </CardHeader>
                <CardContent>
                  <EquipmentSelector
                    equipmentCategories={workoutEquipmentCategories}
                    availableEquipment={workoutAvailableEquipment}
                    onEquipmentCategoriesChange={setWorkoutEquipmentCategories}
                    onAvailableEquipmentChange={setWorkoutAvailableEquipment}
                    showTitle={false}
                    trainerId={selectedTrainerId ?? undefined}
                    focusId={selectedFocusId}
                    fitnessLevel={profile?.fitness_level}
                    userAvailableEquipment={profile?.available_equipment}
                  />
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={
                  submitting ||
                  dailyLoading ||
                  missingDailyState ||
                  !waiver ||
                  !hasAgreedToWaiver ||
                  !canGenerate
                }
                size="lg"
              >
                {submitting
                  ? "Generating…"
                  : reverseTrialAiLocked
                    ? "Trial ended — upgrade for AI"
                    : !canGenerate
                      ? "Workout Limit Reached"
                      : `Generate with ${selectedTrainer.name.split(" ")[0]}`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Generating */}
        {step === "generating" && selectedTrainer && (
          <Card className={selectedTrainer.accentColor}>
            <CardContent className="py-12 text-center">
              <div className="animate-pulse space-y-4">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold border-2 overflow-hidden ${selectedTrainer.accentColor} ${selectedTrainer.borderColor}`}
                >
                  {selectedTrainer.imageUrl ? (
                    <Image
                      src={selectedTrainer.imageUrl}
                      alt={selectedTrainer.name}
                      width={80}
                      height={80}
                      className="w-full h-full rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-foreground/80">
                      {selectedTrainer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedTrainer.name} is creating your workout...
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    &ldquo;{selectedTrainer.philosophy}&rdquo;
                  </p>
                </div>
                <div className="flex justify-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function GenerateWorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <GenerateWorkoutPageContent />
    </Suspense>
  );
}
