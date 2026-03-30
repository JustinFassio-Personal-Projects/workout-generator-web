"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AIExerciseService } from "@/services/ai-exercise-service";
import { AIQuotaExceededError } from "@/lib/ai-quota-error";
import { buildAIEditContext } from "@/lib/genkit/utils/ai-context-helpers";
import { useUpgradeModal } from "@/components/upgrade";
import { ReverseTrialAiLockedBanner } from "@/components/reverse-trial/ReverseTrialAiLockedBanner";
import { useReverseTrialAiLock } from "@/hooks/useReverseTrialAiLock";
import { AIProcessingState } from "./AIProcessingState";
import { FeedbackCollection } from "./FeedbackCollection";
import {
  ImageRegenerationPrompt,
  shouldOfferImageRegeneration,
} from "./ImageRegenerationPrompt";
import { SWAP_OPTIONS, getSwapOption } from "./constants";
import type { SwapModePanelProps } from "./types";
import type {
  AISwapRequest,
  AISwapResponse,
  AISwapSuggestion,
  ExerciseAIEditHistory,
} from "@/types/ai-exercise-editor";
import type {
  TrainerWorkoutExercise,
  TrainerWorkout,
  WorkoutSectionType,
} from "@/types/firestore";
import { Timestamp } from "firebase/firestore";

const DEFAULT_CONSTRAINTS = {
  same_muscle_group: true,
  same_equipment: true,
  same_difficulty: true,
  similar_movement_pattern: false,
};

/**
 * Panel component for swap mode of AI exercise editor.
 * Provides swap reason input, constraints, and displays suggestions.
 */
export function SwapModePanel({
  exercise,
  workoutId,
  sectionIndex,
  exerciseIndex,
  workout,
  onApply,
  onUpdateImageUrl,
}: SwapModePanelProps) {
  const [swapReason, setSwapReason] = useState("");
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [selectedSwapOption, setSelectedSwapOption] = useState<string | null>(
    null
  );
  const [lastReasonSent, setLastReasonSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [swapResponse, setSwapResponse] = useState<AISwapResponse | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AISwapSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    remaining: number | null;
    tier: string;
  } | null>(null);
  const [appliedEditId, setAppliedEditId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [imageRegenerated, setImageRegenerated] = useState(false);
  const [appliedExercise, setAppliedExercise] =
    useState<TrainerWorkoutExercise | null>(null);
  const [appliedFieldsModified, setAppliedFieldsModified] = useState<string[]>(
    []
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showUpgradeModal, showPricingModal } = useUpgradeModal();
  const { aiLocked, onLockedAction } = useReverseTrialAiLock("ai_swap_panel");

  // Reset post-edit state when exercise changes (indicates new dialog session)
  useEffect(() => {
    setAppliedEditId(null);
    setShowFeedback(false);
    setImageRegenerated(false);
    setAppliedExercise(null);
    setAppliedFieldsModified([]);
    // Also reset swap-related state for clean slate
    setSelectedSuggestion(null);
    setSwapResponse(null);
    setError(null);
    setSelectedSwapOption(null);
    setLastReasonSent(null);
  }, [exercise]);

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        const el = bottomRef.current;
        if (el) {
          const { top, bottom } = el.getBoundingClientRect();
          const inView = top < window.innerHeight && bottom > 0;
          if (!inView) {
            el.scrollIntoView({ behavior: "smooth", block: "end" });
          }
        }
      });
    }
  }, []);

  const handleSwapOptionClick = useCallback(
    (optionId: string) => {
      setSelectedSwapOption(optionId);
      setError(null);
      setSwapResponse(null);
      setSelectedSuggestion(null);
      const option = getSwapOption(optionId);
      if (option?.defaultReason) {
        setSwapReason(option.defaultReason);
      } else {
        setSwapReason("");
      }
      if (option?.constraintPreset) {
        setConstraints((prev) => ({ ...prev, ...option.constraintPreset }));
      }
      setTimeout(() => scrollToBottom(), 100);
    },
    [scrollToBottom]
  );

  const handleGenerateSwap = useCallback(async () => {
    if (loading) return;
    if (aiLocked) {
      onLockedAction();
      return;
    }

    const option = selectedSwapOption
      ? getSwapOption(selectedSwapOption)
      : null;
    const isSearchByName = option?.requiresInput === true;

    let reason: string;
    if (isSearchByName) {
      if (!swapReason.trim()) {
        toast.error("Please enter an exercise name to find");
        return;
      }
      reason = `Find specific exercise: ${swapReason.trim()}`;
    } else {
      const parts = [option?.defaultReason, swapReason.trim()].filter(Boolean);
      reason = parts.join("\n\n");
      if (!reason) {
        toast.error(
          "Please select a swap option or describe what you want to swap to"
        );
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSwapResponse(null);
    setSelectedSuggestion(null);
    setLastReasonSent(reason);

    try {
      // Build context from workout - buildAIEditContext needs a TrainerWorkout
      // Build minimal TrainerWorkout-like object for buildAIEditContext
      const workoutForContext = {
        id: workoutId,
        focus: workout.focus,
        difficulty: workout.difficulty,
        generation_context: workout.generation_context || {
          profile_snapshot: {
            fitness_level: "beginner",
            injuries: [],
            equipment_access: "none",
            available_equipment: [],
          },
          daily_state_snapshot: null,
          used_profile_data: false,
          used_daily_state: false,
          equipment_override: false,
        },
        sections: workout.sections.map((s, idx) => {
          // Get section type from original workout or default
          // The workout prop has minimal typing, but we need full structure for buildAIEditContext
          const sectionUnknown = (
            workout as unknown as {
              sections?: Array<{ type?: string; durationEstimate?: string }>;
            }
          ).sections?.[idx];
          const sectionWithType = s as unknown as {
            type?: string;
            durationEstimate?: string;
          };

          return {
            type: (sectionUnknown?.type ||
              sectionWithType?.type ||
              "Main Workout") as WorkoutSectionType,
            durationEstimate: sectionUnknown?.durationEstimate || "10 mins",
            exercises: (s.exercises || []).map((e, eIdx) => {
              // Use the full exercise if available from the actual workout, otherwise use minimal data
              const fullExercise =
                idx === sectionIndex && eIdx === exerciseIndex
                  ? exercise
                  : (e as unknown as Partial<TrainerWorkoutExercise>);

              return {
                name: fullExercise.name || e.name || "",
                sets: fullExercise.sets ?? 3,
                muscleTarget: fullExercise.muscleTarget || "",
                tempo: fullExercise.tempo ?? null,
                cues: fullExercise.cues ?? [],
                detailedInstructions: fullExercise.detailedInstructions ?? null,
                setDetails: fullExercise.setDetails ?? [],
                equipment_needed: fullExercise.equipment_needed ?? [],
                muscle_groups: fullExercise.muscle_groups ?? [],
                image_url: fullExercise.image_url,
              };
            }),
          };
        }),
      } as unknown as TrainerWorkout;

      const context = buildAIEditContext(
        workoutForContext,
        sectionIndex,
        exerciseIndex
      );

      // Build swap request
      const swapRequest: AISwapRequest = {
        reason,
        constraints,
        context,
      };

      // Call API
      const response = await AIExerciseService.generateExerciseSwap(
        workoutId,
        sectionIndex,
        exerciseIndex,
        swapRequest
      );

      setSwapResponse(response);
      setUsage(response.usage);

      if (response.suggestions.length === 0) {
        toast.warning(
          "No swap suggestions generated. Please try with different constraints."
        );
      } else {
        toast.success(
          `${response.suggestions.length} swap suggestions generated!`,
          {
            description:
              response.usage?.remaining != null
                ? `${response.usage.remaining} AI actions remaining`
                : undefined,
          }
        );
      }
    } catch (err: unknown) {
      if (AIQuotaExceededError.is(err)) {
        const exhausted = (err.remaining ?? 0) === 0;
        if (exhausted) {
          if (err.tier === "basic" || err.tier === "pro") {
            showPricingModal();
          } else {
            showUpgradeModal("ai_swap_limit");
          }
        } else {
          toast.error(err.message, {
            description:
              err.remaining > 0
                ? `You have ${err.remaining} AI actions remaining this month.`
                : undefined,
          });
        }
        setError(null);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.error("Error generating swap:", err);
      }

      // Handle waiver redirect
      if (err && typeof err === "object" && "waiver_url" in err) {
        const waiverUrl = (err as { waiver_url?: string }).waiver_url;
        toast.error("Waiver agreement required", {
          action: {
            label: "Sign Waiver",
            onClick: () => {
              if (waiverUrl) window.location.href = waiverUrl;
            },
          },
        });
        setError("Waiver agreement required");
        return;
      }

      // Generic error
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to generate swap suggestions. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    aiLocked,
    onLockedAction,
    swapReason,
    constraints,
    selectedSwapOption,
    workout,
    workoutId,
    sectionIndex,
    exerciseIndex,
    exercise,
    showUpgradeModal,
    showPricingModal,
  ]);

  const handleSelectSuggestion = useCallback((suggestion: AISwapSuggestion) => {
    setSelectedSuggestion(suggestion);
  }, []);

  const handleApplySwap = useCallback(async () => {
    if (applying) return;
    if (!selectedSuggestion) return;

    setApplying(true);
    try {
      // Create edit history entry for swap
      // crypto.randomUUID() is available in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
      // Next.js 16 targets modern browsers, so the check is unnecessary but kept for safety
      const editId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Compute which fields actually changed between original and swapped exercise
      const fieldsModified: string[] = [];
      const newExercise = selectedSuggestion.exercise;

      if (exercise.name !== newExercise.name) fieldsModified.push("name");
      if (exercise.muscleTarget !== newExercise.muscleTarget)
        fieldsModified.push("muscleTarget");
      if (
        exercise.equipment_needed?.join(",") !==
        newExercise.equipment_needed?.join(",")
      )
        fieldsModified.push("equipment_needed");
      if (
        exercise.muscle_groups?.join(",") !==
        newExercise.muscle_groups?.join(",")
      )
        fieldsModified.push("muscle_groups");
      if (exercise.image_url !== newExercise.image_url)
        fieldsModified.push("image_url");
      if (exercise.detailedInstructions !== newExercise.detailedInstructions)
        fieldsModified.push("detailedInstructions");
      if (exercise.cues?.join(",") !== newExercise.cues?.join(","))
        fieldsModified.push("cues");
      if (exercise.tempo !== newExercise.tempo) fieldsModified.push("tempo");
      if (exercise.sets !== newExercise.sets) fieldsModified.push("sets");
      if (
        JSON.stringify(exercise.setDetails) !==
        JSON.stringify(newExercise.setDetails)
      )
        fieldsModified.push("setDetails");

      // Fallback to ["name"] if no fields detected (shouldn't happen, but defensive)
      const finalFieldsModified =
        fieldsModified.length > 0 ? fieldsModified : ["name"];

      const editHistory: ExerciseAIEditHistory = {
        edit_id: editId,
        edit_type: "ai_swap",
        user_prompt: lastReasonSent ?? swapReason,
        applied_at: Timestamp.now(),
        previous_exercise: {
          name: exercise.name,
          sets: exercise.sets,
          detailedInstructions: exercise.detailedInstructions,
          cues: exercise.cues,
          muscleTarget: exercise.muscleTarget,
          tempo: exercise.tempo,
          image_url: exercise.image_url,
          setDetails: exercise.setDetails,
          equipment_needed: exercise.equipment_needed,
          muscle_groups: exercise.muscle_groups,
        },
        ai_model: swapResponse?.metadata.ai_model || "unknown",
        generation_tokens: swapResponse?.metadata.generation_tokens || 0,
        generation_cost_usd: swapResponse?.metadata.generation_cost_usd || 0,
        genkit_trace_id: swapResponse?.metadata.genkit_trace_id || null,
        fields_modified: finalFieldsModified,
        user_rating: null,
        user_feedback: null,
      };

      await onApply(selectedSuggestion.exercise, editHistory);

      // Show image regeneration prompt or feedback after successful apply
      setAppliedEditId(editId);
      setAppliedExercise(selectedSuggestion.exercise);
      setAppliedFieldsModified(finalFieldsModified);
      setShowFeedback(true);
      setImageRegenerated(false);
    } catch (err) {
      console.error("Error applying swap:", err);
      toast.error("Failed to apply swap. Please try again.");
    } finally {
      setApplying(false);
    }
  }, [
    applying,
    selectedSuggestion,
    exercise,
    lastReasonSent,
    swapReason,
    swapResponse,
    onApply,
  ]);

  const selectedOption = selectedSwapOption
    ? getSwapOption(selectedSwapOption)
    : null;
  const isSearchByName = selectedOption?.requiresInput === true;
  const canGenerate = isSearchByName
    ? !!swapReason.trim()
    : !!(selectedOption?.defaultReason || swapReason.trim());
  const textareaPlaceholder = isSearchByName
    ? "Enter exercise name to find..."
    : "Describe what you want to swap to...";

  return (
    <div className="space-y-6">
      <ReverseTrialAiLockedBanner />
      {/* Header: Title */}
      <Label className="text-base font-semibold">Swap Exercise</Label>

      {/* Swap options grid */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Swap options
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SWAP_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedSwapOption === opt.id;
            return (
              <Card
                key={opt.id}
                className={`cursor-pointer transition-all hover:border-primary ${isSelected ? "border-primary bg-primary/5" : ""}`}
                onClick={() => handleSwapOptionClick(opt.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm">{opt.label}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {opt.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Textarea */}
      <div className="space-y-2">
        <Label htmlFor="swap-reason">Describe what you want to swap to</Label>
        <Textarea
          id="swap-reason"
          placeholder={textareaPlaceholder}
          value={swapReason}
          onChange={(e) => setSwapReason(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <Separator />

      {/* Options (Constraints) */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Options</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-muscle-group"
              checked={constraints.same_muscle_group}
              onCheckedChange={(checked) =>
                setConstraints((prev) => ({
                  ...prev,
                  same_muscle_group: checked === true,
                }))
              }
            />
            <Label
              htmlFor="same-muscle-group"
              className="text-sm font-normal cursor-pointer"
            >
              Target same muscle group ({exercise.muscleTarget || "N/A"})
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-equipment"
              checked={constraints.same_equipment}
              onCheckedChange={(checked) =>
                setConstraints((prev) => ({
                  ...prev,
                  same_equipment: checked === true,
                }))
              }
            />
            <Label
              htmlFor="same-equipment"
              className="text-sm font-normal cursor-pointer"
            >
              Use available equipment only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-difficulty"
              checked={constraints.same_difficulty}
              onCheckedChange={(checked) =>
                setConstraints((prev) => ({
                  ...prev,
                  same_difficulty: checked === true,
                }))
              }
            />
            <Label
              htmlFor="same-difficulty"
              className="text-sm font-normal cursor-pointer"
            >
              Keep similar difficulty level
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="similar-movement"
              checked={constraints.similar_movement_pattern}
              onCheckedChange={(checked) =>
                setConstraints((prev) => ({
                  ...prev,
                  similar_movement_pattern: checked === true,
                }))
              }
            />
            <Label
              htmlFor="similar-movement"
              className="text-sm font-normal cursor-pointer"
            >
              Similar movement pattern
            </Label>
          </div>
        </div>
      </div>

      {/* Rate Limit Info */}
      {usage && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {usage.remaining === null
              ? "Unlimited"
              : `${usage.remaining} remaining`}
          </Badge>
          <Badge variant="outline">{usage.tier}</Badge>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerateSwap}
        disabled={loading || !canGenerate}
        className="w-full"
      >
        {loading ? "Generating Suggestions..." : "Generate Swap Suggestions"}
      </Button>

      {/* Processing State */}
      {loading && (
        <AIProcessingState
          state="loading"
          message="AI is generating swap suggestions..."
        />
      )}

      {/* Error State */}
      {error && !loading && (
        <AIProcessingState
          state="error"
          error={error}
          onRetry={handleGenerateSwap}
        />
      )}

      {/* Swap Suggestions */}
      {swapResponse && swapResponse.suggestions.length > 0 && !loading && (
        <div className="space-y-4">
          <AIProcessingState
            state="success"
            message={`${swapResponse.suggestions.length} suggestions generated!`}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {swapResponse.suggestions.map((suggestion) => (
              <Card
                key={suggestion.rank}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedSuggestion?.rank === suggestion.rank
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">#{suggestion.rank}</Badge>
                    <Badge variant="outline">
                      {Math.round(suggestion.match_score)}% match
                    </Badge>
                  </div>
                  <CardTitle className="text-base">
                    {suggestion.exercise.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-2">
                    {suggestion.explanation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Targets: </span>
                      <span className="text-muted-foreground">
                        {suggestion.exercise.muscleTarget || "N/A"}
                      </span>
                    </div>
                    {suggestion.exercise.equipment_needed &&
                      suggestion.exercise.equipment_needed.length > 0 && (
                        <div>
                          <span className="font-medium">Equipment: </span>
                          <span className="text-muted-foreground">
                            {suggestion.exercise.equipment_needed.join(", ")}
                          </span>
                        </div>
                      )}
                    <div>
                      <span className="font-medium">Sets: </span>
                      <span className="text-muted-foreground">
                        {suggestion.exercise.sets}
                      </span>
                    </div>
                  </div>
                  {selectedSuggestion?.rank === suggestion.rank && (
                    <Button
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplySwap();
                      }}
                    >
                      Select This Exercise
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedSuggestion && !showFeedback && (
            <div className="flex gap-2">
              <Button
                onClick={handleApplySwap}
                disabled={applying}
                className="flex-1"
              >
                {applying ? "Applying..." : "Apply Swap"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSuggestion(null);
                  setSwapResponse(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Image Regeneration Prompt - Shown after swap is applied, before feedback */}
      {showFeedback &&
        appliedEditId &&
        appliedExercise &&
        !imageRegenerated &&
        shouldOfferImageRegeneration(appliedFieldsModified) && (
          <div className="space-y-4">
            <AIProcessingState
              state="success"
              message="Swap applied successfully!"
            />
            <ImageRegenerationPrompt
              exercise={appliedExercise}
              workoutId={workoutId}
              onRegenerateComplete={async (newImageUrl) => {
                // Update the exercise's image_url in the workout
                if (onUpdateImageUrl) {
                  try {
                    await onUpdateImageUrl(newImageUrl);
                  } catch (error) {
                    if (process.env.NODE_ENV === "development") {
                      console.error("Failed to update image URL:", error);
                    }
                    toast.error(
                      "Failed to update image. Please refresh the page."
                    );
                    return;
                  }
                }
                // Image regenerated, now show feedback
                setImageRegenerated(true);
                toast.success("Image regenerated successfully!");
              }}
              onSkip={() => {
                // Skip image regeneration, proceed to feedback
                setImageRegenerated(true);
              }}
            />
          </div>
        )}

      {/* Feedback Collection - Shown after swap is applied (and optionally after image regeneration) */}
      {showFeedback &&
        appliedEditId &&
        (imageRegenerated ||
          !appliedExercise ||
          !shouldOfferImageRegeneration(appliedFieldsModified)) && (
          <div className="space-y-4">
            {!imageRegenerated &&
              appliedExercise &&
              !shouldOfferImageRegeneration(appliedFieldsModified) && (
                <AIProcessingState
                  state="success"
                  message="Swap applied successfully!"
                />
              )}
            <FeedbackCollection
              editId={appliedEditId}
              workoutId={workoutId}
              sectionIndex={sectionIndex}
              exerciseIndex={exerciseIndex}
              onSuccess={() => {
                // Reset state after feedback is submitted
                setSelectedSuggestion(null);
                setSwapResponse(null);
                setShowFeedback(false);
                setAppliedEditId(null);
                setImageRegenerated(false);
                setAppliedExercise(null);
              }}
            />
          </div>
        )}
      <div ref={bottomRef} />
    </div>
  );
}
