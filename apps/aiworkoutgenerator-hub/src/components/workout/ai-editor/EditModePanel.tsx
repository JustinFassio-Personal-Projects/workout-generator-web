"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AIExerciseService } from "@/services/ai-exercise-service";
import { AIQuotaExceededError } from "@/lib/ai-quota-error";
import { buildAIEditContext } from "@/lib/genkit/utils/ai-context-helpers";
// Note: Cannot import DEFAULT_MODEL from @/lib/genkit in client components (Genkit is server-only)
// Using the actual model name as a constant here to match the server-side DEFAULT_MODEL
const DEFAULT_AI_MODEL = "googleai/gemini-2.0-flash";
import { getIdToken } from "@/lib/auth";
import { useUpgradeModal } from "@/components/upgrade";
import { AIProcessingState } from "./AIProcessingState";
import { ExercisePreview } from "./ExercisePreview";
import { FeedbackCollection } from "./FeedbackCollection";
import {
  ImageRegenerationPrompt,
  shouldOfferImageRegeneration,
} from "./ImageRegenerationPrompt";
import { QUICK_ACTIONS } from "./constants";
import type { EditModePanelProps } from "./types";
import type {
  AIEditRequest,
  AIEditResponse,
  ExerciseAIEditHistory,
  CoachExplainResponse,
} from "@/types/ai-exercise-editor";
import type {
  TrainerWorkoutExercise,
  TrainerWorkout,
  WorkoutSectionType,
} from "@/types/firestore";
import { Timestamp } from "firebase/firestore";

/**
 * Panel component for edit mode of AI exercise editor.
 * Provides quick actions, custom prompt input, and options.
 */
export function EditModePanel({
  exercise,
  workoutId,
  sectionIndex,
  exerciseIndex,
  workout,
  onApply,
  onUpdateImageUrl,
  initialAction,
}: EditModePanelProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(
    initialAction || null
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [additionalInput, setAdditionalInput] = useState("");
  const [coachExplainLevel, setCoachExplainLevel] = useState<
    "beginner" | "intermediate" | "advanced" | "elite" | "athlete" | ""
  >("");
  const [options, setOptions] = useState({
    preserve_sets_reps: true,
    maintain_muscle_target: true,
    regenerate_image: false,
  });
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [editResponse, setEditResponse] = useState<AIEditResponse | null>(null);
  const [coachExplainResponse, setCoachExplainResponse] =
    useState<CoachExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    remaining: number | null;
    tier: string;
  } | null>(null);
  const [appliedEditId, setAppliedEditId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [imageRegenerated, setImageRegenerated] = useState(false);
  const [showFitnessLevelAlert, setShowFitnessLevelAlert] = useState(false);
  const successMessageRef = useRef<HTMLDivElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const coachExplainSectionRef = useRef<HTMLDivElement>(null);
  const fitnessLevelDropdownRef = useRef<HTMLDivElement>(null);
  const generateCoachExplainButtonRef = useRef<HTMLButtonElement>(null);
  const { showUpgradeModal, showPricingModal } = useUpgradeModal();

  // Reset post-edit state when exercise changes (indicates new dialog session)
  useEffect(() => {
    setAppliedEditId(null);
    setShowFeedback(false);
    setImageRegenerated(false);
    // Also reset edit-related state for clean slate
    setEditResponse(null);
    setCoachExplainResponse(null);
    setError(null);
    setCoachExplainLevel("");
    // Set initial action if provided
    if (initialAction) {
      setSelectedAction(initialAction);
      // Show alert if Coach Explain is the initial action
      if (initialAction === "coach_explain") {
        setShowFitnessLevelAlert(true);
      }
    } else {
      setSelectedAction(null);
      setShowFitnessLevelAlert(false);
    }
  }, [exercise, initialAction]);

  // Optimized scroll function using requestAnimationFrame
  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        const element = bottomRef.current;
        if (element) {
          const isInViewport =
            element.getBoundingClientRect().top < window.innerHeight &&
            element.getBoundingClientRect().bottom > 0;

          if (!isInViewport) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
          }
        }
      });
    }
  }, []);

  const handleQuickActionClick = useCallback(
    (actionId: string) => {
      setSelectedAction(actionId);
      setError(null);
      setEditResponse(null);
      setCoachExplainResponse(null);
      const action = QUICK_ACTIONS.find((a) => a.id === actionId);
      if (action?.defaultPrompt) {
        setCustomPrompt(action.defaultPrompt);
      } else {
        setCustomPrompt("");
      }
      if (action?.requiresInput) {
        setAdditionalInput("");
      } else {
        setAdditionalInput("");
      }
      // Reset Coach Explain level when switching actions
      if (actionId !== "coach_explain") {
        setCoachExplainLevel("");
      }

      // Auto-scroll to bottom of dialog when quick action is selected
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    },
    [scrollToBottom]
  );

  const handleGenerateEdit = useCallback(async () => {
    if (loading) return;

    const action = selectedAction
      ? QUICK_ACTIONS.find((a) => a.id === selectedAction)
      : null;

    // Handle Coach Explain separately
    if (selectedAction === "coach_explain") {
      if (!coachExplainLevel) {
        toast.error("Please select your fitness level");
        return;
      }

      setLoading(true);
      setError(null);
      setCoachExplainResponse(null);

      // Auto-scroll to loading state
      setTimeout(() => {
        scrollToBottom();
      }, 100);

      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch("/api/workouts/coach-explain", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            exerciseName: exercise.name,
            userLevel: coachExplainLevel,
            workoutId,
            sectionIndex,
            exerciseIndex,
          }),
        });

        if (!response.ok) {
          let errorData: {
            error?: string;
            message?: string;
            tier?: string;
            remaining?: number;
          };

          try {
            errorData = await response.json();
          } catch {
            // If response is not JSON, create a generic error
            errorData = {
              error: `Request failed with status ${response.status}`,
            };
          }

          const errorMessage =
            errorData.message ||
            errorData.error ||
            "Failed to generate Coach Explain";

          const isAIQuotaLimit =
            errorData.error === "AI action limit reached" &&
            (response.status === 403 || response.status === 429);

          if (isAIQuotaLimit) {
            throw new AIQuotaExceededError(
              errorData.message || errorData.error || "AI action limit reached",
              {
                tier: errorData.tier,
                remaining: errorData.remaining ?? 0,
              }
            );
          }

          throw new Error(errorMessage);
        }

        const data: CoachExplainResponse = await response.json();
        setCoachExplainResponse(data);
        toast.success("Coach Explain generated successfully!", {
          description:
            data.usage?.remaining != null
              ? `${data.usage.remaining} Coach Explain requests remaining`
              : undefined,
        });
      } catch (err: unknown) {
        if (AIQuotaExceededError.is(err)) {
          const exhausted = (err.remaining ?? 0) === 0;
          if (exhausted) {
            if (err.tier === "basic" || err.tier === "pro") {
              showPricingModal();
            } else {
              showUpgradeModal("coach_explain_limit");
            }
          } else {
            toast.error(err.message, {
              description: `You have ${err.remaining} AI actions remaining.`,
            });
          }
          setError(null);
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("Error generating Coach Explain:", err);
          }
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to generate Coach Explain. Please try again.";
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedAction && !customPrompt.trim()) {
      toast.error("Please select a quick action or enter a custom prompt");
      return;
    }

    // Build prompt
    let userPrompt = customPrompt.trim();
    if (action?.requiresInput && additionalInput.trim()) {
      userPrompt = `${userPrompt}\n\n${additionalInput.trim()}`;
    } else if (action?.requiresInput && !additionalInput.trim()) {
      toast.error(
        `Please provide ${action.inputPlaceholder?.toLowerCase() || "additional details"}`
      );
      return;
    }

    if (!userPrompt) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setEditResponse(null);

    try {
      // Build context from workout - buildAIEditContext needs a TrainerWorkout
      // We have the workout props which should contain all needed data
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

      // Build edit request
      const editRequest: AIEditRequest = {
        mode: action?.mode || "custom",
        user_prompt: userPrompt,
        context,
        options: {
          preserve_sets_reps: options.preserve_sets_reps,
          maintain_muscle_target: options.maintain_muscle_target,
          regenerate_image: options.regenerate_image,
        },
      };

      // Call API
      const response = await AIExerciseService.generateExerciseEdit(
        workoutId,
        sectionIndex,
        exerciseIndex,
        editRequest
      );

      setEditResponse(response);
      setUsage(response.usage);
      toast.success("Exercise edit generated successfully!", {
        description:
          response.usage?.remaining != null
            ? `${response.usage.remaining} AI actions remaining`
            : undefined,
      });
    } catch (err: unknown) {
      if (AIQuotaExceededError.is(err)) {
        const exhausted = (err.remaining ?? 0) === 0;
        if (exhausted) {
          if (err.tier === "basic" || err.tier === "pro") {
            showPricingModal();
          } else {
            showUpgradeModal("ai_edit_limit");
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
        console.error("Error generating edit:", err);
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
          : "Failed to generate exercise edit. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    selectedAction,
    customPrompt,
    additionalInput,
    coachExplainLevel,
    options,
    workout,
    workoutId,
    sectionIndex,
    exerciseIndex,
    exercise,
    scrollToBottom,
    showUpgradeModal,
    showPricingModal,
  ]);

  // Scroll to loading state when Coach Explain generation starts
  useEffect(() => {
    if (
      loading &&
      selectedAction === "coach_explain" &&
      successMessageRef.current
    ) {
      // Use requestAnimationFrame with a slight delay to ensure loading state is rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          const element = successMessageRef.current;
          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 150);
      });
    }
  }, [loading, scrollToBottom, selectedAction]);

  // Scroll to success message when edit is generated
  useEffect(() => {
    if (
      (editResponse || coachExplainResponse) &&
      !loading &&
      successMessageRef.current
    ) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        const element = successMessageRef.current;
        if (element) {
          // Always scroll to ensure the success message is visible
          // The viewport check was removed as scrollIntoView handles visibility efficiently
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    }
  }, [editResponse, coachExplainResponse, loading]);

  // Autoscroll to Coach Explain section when opened with initialAction
  useEffect(() => {
    if (
      initialAction === "coach_explain" &&
      selectedAction === "coach_explain"
    ) {
      // Delay to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          const isMobile = window.innerWidth < 768; // md breakpoint

          if (isMobile) {
            // On mobile, scroll to Generate button (may be below fold)
            if (generateCoachExplainButtonRef.current) {
              generateCoachExplainButtonRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          } else {
            // On desktop, scroll to Coach Explain section (dropdown)
            if (coachExplainSectionRef.current) {
              coachExplainSectionRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            } else if (fitnessLevelDropdownRef.current) {
              // Fallback to dropdown if section ref not available
              fitnessLevelDropdownRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }
        }, 200);
      });
    }
  }, [initialAction, selectedAction]);

  const handleApplyEdit = useCallback(async () => {
    if (applying) return;

    // Handle Coach Explain response
    if (coachExplainResponse) {
      setApplying(true);
      try {
        const editId =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const editHistory: ExerciseAIEditHistory = {
          edit_id: editId,
          edit_type: "ai_edit",
          edit_mode: "coach_explain",
          user_prompt: `Coach Explain for ${coachExplainLevel} level`,
          applied_at: Timestamp.now(),
          previous_exercise: {
            name: exercise.name,
            sets: exercise.sets,
            detailedInstructions: exercise.detailedInstructions,
            ai_coach_explain: exercise.ai_coach_explain ?? null,
            cues: exercise.cues,
            muscleTarget: exercise.muscleTarget,
            tempo: exercise.tempo,
            image_url: exercise.image_url,
            setDetails: exercise.setDetails,
            equipment_needed: exercise.equipment_needed,
            muscle_groups: exercise.muscle_groups,
          },
          ai_model: coachExplainResponse.metadata?.ai_model || DEFAULT_AI_MODEL,
          generation_tokens:
            coachExplainResponse.metadata?.generation_tokens || 0,
          generation_cost_usd:
            coachExplainResponse.metadata?.generation_cost_usd || 0,
          genkit_trace_id:
            coachExplainResponse.metadata?.genkit_trace_id || null,
          fields_modified: ["ai_coach_explain"],
          user_rating: null,
          user_feedback: null,
        };

        const exerciseToApply = {
          ...exercise,
          ai_coach_explain: coachExplainResponse.detailedInstructions,
        };

        await onApply(exerciseToApply, editHistory);

        setAppliedEditId(editId);
        setShowFeedback(true);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error applying Coach Explain:", err);
        }
        toast.error("Failed to apply Coach Explain. Please try again.");
      } finally {
        setApplying(false);
      }
      return;
    }

    // Handle regular edit response
    if (!editResponse?.modified_exercise) return;

    setApplying(true);
    try {
      // Create edit history entry
      const editId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      const editHistory: ExerciseAIEditHistory = {
        edit_id: editId,
        edit_type: "ai_edit",
        edit_mode: selectedAction
          ? QUICK_ACTIONS.find((a) => a.id === selectedAction)?.mode || "custom"
          : "custom",
        user_prompt:
          customPrompt ||
          (selectedAction &&
            QUICK_ACTIONS.find((a) => a.id === selectedAction)
              ?.defaultPrompt) ||
          "",
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
        ai_model: editResponse.metadata.ai_model,
        generation_tokens: editResponse.metadata.generation_tokens,
        generation_cost_usd: editResponse.metadata.generation_cost_usd,
        genkit_trace_id: editResponse.metadata.genkit_trace_id,
        fields_modified: editResponse.fields_modified,
        user_rating: null,
        user_feedback: null,
      };

      await onApply(editResponse.modified_exercise, editHistory);

      // Show feedback after successful apply
      setAppliedEditId(editId);
      setShowFeedback(true);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error applying edit:", err);
      }
      toast.error("Failed to apply edit. Please try again.");
    } finally {
      setApplying(false);
    }
  }, [
    applying,
    editResponse,
    coachExplainResponse,
    coachExplainLevel,
    exercise,
    customPrompt,
    selectedAction,
    onApply,
  ]);

  return (
    <div className="space-y-6">
      {/* Quick Actions Grid */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Quick Actions
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedAction === action.id;
            return (
              <Card
                key={action.id}
                className={`cursor-pointer transition-all hover:border-primary ${isSelected ? "border-primary bg-primary/5" : ""}`}
                onClick={() => handleQuickActionClick(action.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm">{action.label}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Coach Explain Level Selection */}
      {selectedAction === "coach_explain" && (
        <div ref={coachExplainSectionRef} className="space-y-2">
          <Label htmlFor="coach-explain-level">Select Your Fitness Level</Label>
          <div
            ref={fitnessLevelDropdownRef}
            className={cn(
              showFitnessLevelAlert &&
                "rounded-md border-2 border-orange-500 animate-pulse p-0.5 transition-all"
            )}
          >
            <Select
              value={coachExplainLevel}
              onValueChange={(value) => {
                setCoachExplainLevel(
                  value as
                    | "beginner"
                    | "intermediate"
                    | "advanced"
                    | "elite"
                    | "athlete"
                );
                // Remove alert when user selects a level
                setShowFitnessLevelAlert(false);
              }}
            >
              <SelectTrigger id="coach-explain-level">
                <SelectValue placeholder="Select your fitness level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Custom Prompt Input */}
      {selectedAction !== "coach_explain" && (
        <div className="space-y-2">
          <Label htmlFor="custom-prompt">Custom Prompt</Label>
          <Textarea
            id="custom-prompt"
            placeholder={
              selectedAction &&
              QUICK_ACTIONS.find((a) => a.id === selectedAction)?.requiresInput
                ? QUICK_ACTIONS.find((a) => a.id === selectedAction)
                    ?.inputPlaceholder || "Enter additional details..."
                : "Enter your custom edit instructions (e.g., 'Make this exercise more challenging' or 'Add detailed cues for proper form')"
            }
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
          {selectedAction &&
            QUICK_ACTIONS.find((a) => a.id === selectedAction)
              ?.requiresInput && (
              <Textarea
                placeholder={
                  QUICK_ACTIONS.find((a) => a.id === selectedAction)
                    ?.inputPlaceholder || "Additional details..."
                }
                value={additionalInput}
                onChange={(e) => setAdditionalInput(e.target.value)}
                rows={2}
                className="resize-none"
              />
            )}
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Options</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preserve-sets-reps"
              checked={options.preserve_sets_reps}
              onCheckedChange={(checked) =>
                setOptions((prev) => ({
                  ...prev,
                  preserve_sets_reps: checked === true,
                }))
              }
            />
            <Label
              htmlFor="preserve-sets-reps"
              className="text-sm font-normal cursor-pointer"
            >
              Preserve sets and reps (keep volume the same)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="maintain-muscle-target"
              checked={options.maintain_muscle_target}
              onCheckedChange={(checked) =>
                setOptions((prev) => ({
                  ...prev,
                  maintain_muscle_target: checked === true,
                }))
              }
            />
            <Label
              htmlFor="maintain-muscle-target"
              className="text-sm font-normal cursor-pointer"
            >
              Maintain primary muscle target
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
        ref={generateCoachExplainButtonRef}
        onClick={handleGenerateEdit}
        disabled={
          loading ||
          (selectedAction === "coach_explain"
            ? !coachExplainLevel
            : !selectedAction && !customPrompt.trim())
        }
        className="w-full"
      >
        {loading
          ? selectedAction === "coach_explain"
            ? "Generating Coach Explain..."
            : "Generating..."
          : selectedAction === "coach_explain"
            ? "Generate Coach Explain"
            : "Generate Edit"}
      </Button>

      {/* Error State */}
      {error && !loading && (
        <AIProcessingState
          state="error"
          error={error}
          onRetry={handleGenerateEdit}
        />
      )}

      {/* Loading/Success State - Exercise Preview */}
      {(loading ||
        (editResponse && !showFeedback) ||
        (coachExplainResponse && !showFeedback)) && (
        <div className="space-y-4">
          {loading ? (
            // Loading state in preview area
            <AIProcessingState
              state="loading"
              message={
                selectedAction === "coach_explain"
                  ? "AI is generating your personalized exercise breakdown..."
                  : "AI is generating your exercise modification..."
              }
            />
          ) : coachExplainResponse ? (
            // Coach Explain success state
            <>
              <AIProcessingState
                state="success"
                message="Coach Explain generated successfully!"
              />
              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <h4 className="font-semibold mb-2">Exercise Guide</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {coachExplainResponse.exerciseGuide}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Anatomy Breakdown</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {coachExplainResponse.anatomyBreakdown}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">The Why</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {coachExplainResponse.theWhy}
                  </p>
                </div>
              </div>
            </>
          ) : editResponse ? (
            // Regular edit success state with preview
            <>
              <AIProcessingState
                state="success"
                message="Edit generated successfully!"
              />
              <div ref={imagePreviewRef}>
                <ExercisePreview
                  originalExercise={exercise}
                  modifiedExercise={editResponse.modified_exercise}
                  fieldsModified={editResponse.fields_modified}
                  explanation={editResponse.explanation}
                />
              </div>
            </>
          ) : null}

          {/* Button area - always show, but disable during loading */}
          <div className="flex gap-2">
            <Button
              onClick={handleApplyEdit}
              disabled={
                loading || applying || (!editResponse && !coachExplainResponse)
              }
              className="flex-1"
            >
              {applying ? "Applying..." : "Apply Edit"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditResponse(null);
                setCoachExplainResponse(null);
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Image Regeneration Prompt - Shown after edit is applied, before feedback */}
      {showFeedback &&
        appliedEditId &&
        editResponse &&
        !imageRegenerated &&
        !coachExplainResponse &&
        shouldOfferImageRegeneration(editResponse.fields_modified) && (
          <div className="space-y-4">
            <AIProcessingState
              state="success"
              message="Edit applied successfully!"
            />
            <ImageRegenerationPrompt
              exercise={editResponse.modified_exercise}
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

      {/* Feedback Collection - Shown after edit is applied (and optionally after image regeneration) */}
      {showFeedback &&
        appliedEditId &&
        (imageRegenerated ||
          !editResponse ||
          coachExplainResponse ||
          !shouldOfferImageRegeneration(
            editResponse?.fields_modified || []
          )) && (
          <div className="space-y-4">
            {!imageRegenerated &&
              editResponse &&
              !coachExplainResponse &&
              !shouldOfferImageRegeneration(editResponse.fields_modified) && (
                <AIProcessingState
                  state="success"
                  message="Edit applied successfully!"
                />
              )}
            {coachExplainResponse && (
              <AIProcessingState
                state="success"
                message="Coach Explain applied successfully!"
              />
            )}
            <FeedbackCollection
              editId={appliedEditId}
              workoutId={workoutId}
              sectionIndex={sectionIndex}
              exerciseIndex={exerciseIndex}
              onSuccess={() => {
                // Reset state after feedback is submitted
                setEditResponse(null);
                setCoachExplainResponse(null);
                setError(null);
                setShowFeedback(false);
                setAppliedEditId(null);
                setImageRegenerated(false);
                setCoachExplainLevel("");
              }}
            />
          </div>
        )}
      {/* Bottom ref for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
