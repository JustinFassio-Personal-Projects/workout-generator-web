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
import { buildAIEditContext } from "@/lib/genkit/utils/ai-context-helpers";
import { useUpgradeModal } from "@/components/upgrade";
import { AIProcessingState } from "./AIProcessingState";
import { FeedbackCollection } from "./FeedbackCollection";
import { SWAP_OPTIONS, getSwapOption } from "./constants";
import type { AddModePanelProps } from "./types";
import type {
  AIAddRequest,
  AIAddResponse,
  AISwapSuggestion,
  ExerciseAIAddHistoryEntry,
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

export function AddModePanel({
  exercise,
  workoutId,
  sectionIndex,
  exerciseIndex,
  insertPosition,
  workout,
  onApplyAdd,
}: AddModePanelProps) {
  const [addReason, setAddReason] = useState("");
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [lastReasonSent, setLastReasonSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [addResponse, setAddResponse] = useState<AIAddResponse | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<AISwapSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    remaining: number | null;
    tier: string;
  } | null>(null);
  const [appliedEditId, setAppliedEditId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showUpgradeModal, showPricingModal } = useUpgradeModal();

  const addedExerciseIndex =
    insertPosition === "before" ? exerciseIndex : exerciseIndex + 1;

  useEffect(() => {
    setAppliedEditId(null);
    setShowFeedback(false);
    setSelectedSuggestion(null);
    setAddResponse(null);
    setError(null);
    setSelectedOptionId(null);
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

  const handleOptionClick = useCallback(
    (optionId: string) => {
      setSelectedOptionId(optionId);
      setError(null);
      setAddResponse(null);
      setSelectedSuggestion(null);
      const opt = getSwapOption(optionId);
      if (opt?.defaultReason) {
        setAddReason(opt.defaultReason);
      } else {
        setAddReason("");
      }
      if (opt?.constraintPreset) {
        setConstraints((prev) => ({ ...prev, ...opt.constraintPreset }));
      }
      setTimeout(() => scrollToBottom(), 100);
    },
    [scrollToBottom]
  );

  const handleGenerate = useCallback(async () => {
    if (loading) return;

    const opt = selectedOptionId ? getSwapOption(selectedOptionId) : null;
    const isSearchByName = opt?.requiresInput === true;

    let reason: string;
    if (isSearchByName) {
      if (!addReason.trim()) {
        toast.error("Please enter an exercise name to find");
        return;
      }
      reason = `Find specific exercise: ${addReason.trim()}`;
    } else {
      if (!opt?.defaultReason && !addReason.trim()) {
        toast.error("Select an option or describe what you want to add");
        return;
      }
      reason = addReason.trim() || opt?.defaultReason || "";
    }

    setLoading(true);
    setError(null);
    setAddResponse(null);
    setSelectedSuggestion(null);
    setLastReasonSent(reason);

    try {
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
              const fullExercise =
                idx === sectionIndex && eIdx === exerciseIndex
                  ? exercise
                  : (e as unknown as Partial<TrainerWorkoutExercise>);
              return {
                name: fullExercise.name || (e as { name?: string }).name || "",
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

      const addRequest: AIAddRequest = {
        reason,
        constraints,
        context: {
          reference_exercise: context.exercise,
          section_type: context.section_type,
          workout_focus: context.workout_focus,
          workout_difficulty: context.workout_difficulty,
          user_fitness_level: context.user_fitness_level,
          user_injuries: context.user_injuries,
          available_equipment: context.available_equipment,
          adjacent_exercises: context.adjacent_exercises,
        },
      };

      const response = await AIExerciseService.generateExerciseAdd(
        workoutId,
        sectionIndex,
        exerciseIndex,
        addRequest
      );

      setAddResponse(response);
      setUsage(response.usage);

      if (response.suggestions.length === 0) {
        toast.warning(
          "No suggestions generated. Try different options or constraints."
        );
      } else {
        toast.success(
          `${response.suggestions.length} exercise suggestions generated!`,
          {
            description:
              response.usage?.remaining != null
                ? `${response.usage.remaining} AI actions remaining`
                : undefined,
          }
        );
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "waiver_url" in err) {
        const waiverUrl = (err as { waiver_url?: string }).waiver_url;
        toast.error("Waiver agreement required", {
          action: waiverUrl
            ? {
                label: "Sign Waiver",
                onClick: () => {
                  window.location.href = waiverUrl;
                },
              }
            : undefined,
        });
        setError("Waiver agreement required");
        return;
      }
      // Handle rate limit with upgrade/pricing modal (tier from API so free vs paid get correct modal)
      if (err && typeof err === "object" && "remaining" in err) {
        const rateErr = err as {
          remaining?: number;
          tier?: string;
          message?: string;
        };
        const remaining = rateErr.remaining;
        const tier = rateErr.tier;
        const msg = err instanceof Error ? err.message : "Rate limit reached";
        if (remaining === 0) {
          // Paid users (basic/pro) see full pricing modal to upgrade tier; free users see Basic-focused upgrade modal
          if (tier === "basic" || tier === "pro") {
            showPricingModal();
          } else {
            showUpgradeModal("ai_add_limit");
          }
        } else {
          toast.error(msg, {
            description: `You have ${remaining} remaining this month.`,
          });
        }
        setError(msg);
        return;
      }
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to generate suggestions. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    addReason,
    constraints,
    selectedOptionId,
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

  const handleApplyAdd = useCallback(async () => {
    if (applying || !selectedSuggestion) return;

    setApplying(true);
    try {
      const editId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const newExercise = selectedSuggestion.exercise;
      const fieldsModified: string[] = [
        "name",
        "sets",
        "muscleTarget",
        "equipment_needed",
        "muscle_groups",
        "detailedInstructions",
        "cues",
        "tempo",
        "setDetails",
      ];

      const editHistory: ExerciseAIAddHistoryEntry = {
        edit_id: editId,
        edit_type: "ai_add",
        user_prompt: lastReasonSent ?? addReason,
        applied_at: Timestamp.now(),
        previous_exercise: {},
        ai_model: addResponse?.metadata.ai_model || "unknown",
        generation_tokens: addResponse?.metadata.generation_tokens || 0,
        generation_cost_usd: addResponse?.metadata.generation_cost_usd || 0,
        genkit_trace_id: addResponse?.metadata.genkit_trace_id || null,
        fields_modified: fieldsModified,
        user_rating: null,
        user_feedback: null,
      };

      await onApplyAdd(newExercise, editHistory, insertPosition);

      setAppliedEditId(editId);
      setShowFeedback(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add exercise.";
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  }, [
    applying,
    selectedSuggestion,
    lastReasonSent,
    addReason,
    addResponse,
    insertPosition,
    onApplyAdd,
  ]);

  const selectedOption = selectedOptionId
    ? getSwapOption(selectedOptionId)
    : null;
  const isSearchByName = selectedOption?.requiresInput === true;
  const canGenerate = isSearchByName
    ? !!addReason.trim()
    : !!(selectedOption?.defaultReason || addReason.trim());
  const textareaPlaceholder = isSearchByName
    ? "Enter exercise name to find..."
    : "Describe what you want to add...";

  return (
    <div className="space-y-6">
      <Label className="text-base font-semibold">Add Exercise</Label>

      <div>
        <Label className="text-base font-semibold mb-3 block">
          Add options
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SWAP_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedOptionId === opt.id;
            return (
              <Card
                key={opt.id}
                className={`cursor-pointer transition-all hover:border-primary ${isSelected ? "border-primary bg-primary/5" : ""}`}
                onClick={() => handleOptionClick(opt.id)}
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

      <div className="space-y-2">
        <Label htmlFor="add-reason">Describe what you want to add</Label>
        <Textarea
          id="add-reason"
          placeholder={textareaPlaceholder}
          value={addReason}
          onChange={(e) => setAddReason(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="text-base font-semibold">Options</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-same-muscle"
              checked={constraints.same_muscle_group}
              onCheckedChange={(c) =>
                setConstraints((prev) => ({
                  ...prev,
                  same_muscle_group: c === true,
                }))
              }
            />
            <Label
              htmlFor="add-same-muscle"
              className="text-sm font-normal cursor-pointer"
            >
              Target same muscle group ({exercise.muscleTarget || "N/A"})
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-same-equipment"
              checked={constraints.same_equipment}
              onCheckedChange={(c) =>
                setConstraints((prev) => ({
                  ...prev,
                  same_equipment: c === true,
                }))
              }
            />
            <Label
              htmlFor="add-same-equipment"
              className="text-sm font-normal cursor-pointer"
            >
              Use available equipment only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-same-difficulty"
              checked={constraints.same_difficulty}
              onCheckedChange={(c) =>
                setConstraints((prev) => ({
                  ...prev,
                  same_difficulty: c === true,
                }))
              }
            />
            <Label
              htmlFor="add-same-difficulty"
              className="text-sm font-normal cursor-pointer"
            >
              Keep similar difficulty level
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-similar-movement"
              checked={constraints.similar_movement_pattern}
              onCheckedChange={(c) =>
                setConstraints((prev) => ({
                  ...prev,
                  similar_movement_pattern: c === true,
                }))
              }
            />
            <Label
              htmlFor="add-similar-movement"
              className="text-sm font-normal cursor-pointer"
            >
              Similar movement pattern
            </Label>
          </div>
        </div>
      </div>

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

      <Button
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        className="w-full"
      >
        {loading ? "Generating…" : "Generate Exercise Suggestions"}
      </Button>

      {loading && (
        <AIProcessingState
          state="loading"
          message="AI is generating exercise suggestions..."
        />
      )}

      {error && !loading && (
        <AIProcessingState
          state="error"
          error={error}
          onRetry={handleGenerate}
        />
      )}

      {addResponse && addResponse.suggestions.length > 0 && !loading && (
        <div className="space-y-4">
          <AIProcessingState
            state="success"
            message={`${addResponse.suggestions.length} suggestions generated!`}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {addResponse.suggestions.map((s) => (
              <Card
                key={s.rank}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedSuggestion?.rank === s.rank
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectSuggestion(s)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary">#{s.rank}</Badge>
                    <Badge variant="outline">
                      {Math.round(s.match_score)}% match
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{s.exercise.name}</CardTitle>
                  <CardDescription className="text-xs mt-2">
                    {s.explanation}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Targets: </span>
                      <span className="text-muted-foreground">
                        {s.exercise.muscleTarget || "N/A"}
                      </span>
                    </div>
                    {s.exercise.equipment_needed?.length > 0 && (
                      <div>
                        <span className="font-medium">Equipment: </span>
                        <span className="text-muted-foreground">
                          {s.exercise.equipment_needed.join(", ")}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Sets: </span>
                      <span className="text-muted-foreground">
                        {s.exercise.sets}
                      </span>
                    </div>
                  </div>
                  {selectedSuggestion?.rank === s.rank && (
                    <Button
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyAdd();
                      }}
                    >
                      Add This Exercise
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedSuggestion && !showFeedback && (
            <div className="flex gap-2">
              <Button
                onClick={handleApplyAdd}
                disabled={applying}
                className="flex-1"
              >
                {applying ? "Adding…" : "Add Exercise"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSuggestion(null);
                  setAddResponse(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {showFeedback && appliedEditId && (
        <div className="space-y-4">
          <AIProcessingState
            state="success"
            message="Exercise added successfully!"
          />
          <FeedbackCollection
            editId={appliedEditId}
            workoutId={workoutId}
            sectionIndex={sectionIndex}
            exerciseIndex={addedExerciseIndex}
            onSuccess={() => {
              setSelectedSuggestion(null);
              setAddResponse(null);
              setShowFeedback(false);
              setAppliedEditId(null);
            }}
          />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
