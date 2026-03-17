"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type {
  TrainerWorkout,
  TrainerWorkoutSection,
  TrainerWorkoutExercise,
} from "@/types/firestore";
import { WorkoutHeader } from "./WorkoutHeader";
import { WorkoutSection } from "./WorkoutSection";
import { ExerciseModal } from "./ExerciseModal";
import { PersonalizationCard } from "./PersonalizationCard";
import { ImageGenerationButton } from "./ImageGenerationButton";
import { AIExerciseEditor } from "./ai-editor/AIExerciseEditor";
import { ExerciseOrderCheckResult } from "./ExerciseOrderCheckResult";
import { ExerciseImageSelectorModal } from "./ExerciseImageSelectorModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useUser } from "@/lib/auth";
import { generateExerciseImage } from "@/services/image/ImageGenerationService";
import { AIExerciseService } from "@/services/ai-exercise-service";
import type {
  ExerciseAIEditHistory,
  ExerciseAIAddHistoryEntry,
  AIOrderCheckResponse,
} from "@/types/ai-exercise-editor";

interface WorkoutDisplayProps {
  workout: TrainerWorkout;
  onSave?: (updatedWorkout: TrainerWorkout) => Promise<void>;
  isEditing?: boolean;
  onWorkoutStateChange?: (workout: TrainerWorkout) => void;
  /**
   * Callback to open the certification workflow modal.
   * Note: This does NOT generate images directly. The "Request Images" button
   * opens the certification modal where users submit workouts for coach review
   * and image certification. Image generation has been decoupled from this flow.
   * @see docs/design/IMAGE_GENERATION_DESIGN_DECISION.md
   */
  onRequestImages?: () => void;
}

/**
 * Main workout display component that shows the full workout with
 * sections, exercises, personalization, and supports weight tracking.
 */
export function WorkoutDisplay({
  workout: initialWorkout,
  onSave,
  isEditing = true,
  onWorkoutStateChange,
  onRequestImages,
}: WorkoutDisplayProps) {
  const [workout, setWorkout] = useState<TrainerWorkout>(initialWorkout);
  const [activeExercise, setActiveExercise] = useState<{
    sIdx: number;
    eIdx: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [weightSaveMessage, setWeightSaveMessage] = useState<string | null>(
    null
  );
  const [retryingImageKey, setRetryingImageKey] = useState<string | null>(null);
  const [aiEditorState, setAIEditorState] = useState<{
    open: boolean;
    sectionIdx: number | null;
    exerciseIdx: number | null;
    initialAction?: string;
  }>({ open: false, sectionIdx: null, exerciseIdx: null });
  const [orderCheckState, setOrderCheckState] = useState<{
    open: boolean;
    loading: boolean;
    result: AIOrderCheckResponse | null;
    error: string | null;
    sectionIdx: number | null;
    exerciseIdx: number | null;
  }>({
    open: false,
    loading: false,
    result: null,
    error: null,
    sectionIdx: null,
    exerciseIdx: null,
  });
  const [imageSelectorState, setImageSelectorState] = useState<{
    open: boolean;
    sectionIdx: number | null;
    exerciseIdx: number | null;
  }>({
    open: false,
    sectionIdx: null,
    exerciseIdx: null,
  });
  const { tier } = useSubscription();
  const { user } = useUser();
  const workoutRef = useRef<TrainerWorkout>(initialWorkout);

  // Sync with external updates
  useEffect(() => {
    setWorkout(initialWorkout);
    workoutRef.current = initialWorkout;
  }, [initialWorkout]);

  // Keep ref in sync with state
  useEffect(() => {
    workoutRef.current = workout;
    // Notify parent of workout state changes (for set completions)
    if (onWorkoutStateChange) {
      onWorkoutStateChange(workout);
    }
  }, [workout, onWorkoutStateChange]);

  const handleOpenModal = useCallback((sIdx: number, eIdx: number) => {
    setActiveExercise({ sIdx, eIdx });
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveExercise(null);
  }, []);

  const handleNavigateModal = useCallback(
    (indices: { sIdx: number; eIdx: number }) => {
      setActiveExercise(indices);
    },
    []
  );

  const handleUpdateSet = useCallback(
    (
      sIdx: number,
      eIdx: number,
      setIdx: number,
      field: string,
      value: string
    ) => {
      setWorkout((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        const set = newSections[sIdx]?.exercises[eIdx]?.setDetails[setIdx];
        if (set) {
          (set as unknown as Record<string, unknown>)[field] = value;
        }
        return { ...prev, sections: newSections };
      });
    },
    []
  );

  const handleSetComplete = useCallback(
    (sIdx: number, eIdx: number, setIdx: number, completed: boolean) => {
      // Only update local state - don't persist to Firestore yet
      // Set completions will be saved when the workout is marked as complete
      setWorkout((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        const exercise = newSections[sIdx]?.exercises[eIdx];
        const set = exercise?.setDetails[setIdx];
        if (set) {
          (set as unknown as Record<string, unknown>).completed = completed;
        }

        // Auto-complete exercise if all sets are now complete
        if (exercise && exercise.setDetails) {
          const allSetsComplete =
            exercise.setDetails.length > 0 &&
            exercise.setDetails.every(
              (s) =>
                (s as unknown as Record<string, unknown>).completed === true
            );
          if (allSetsComplete && !exercise.completed) {
            exercise.completed = true;
          }
        }

        return { ...prev, sections: newSections };
      });
    },
    []
  );

  const handleAddSet = useCallback((sIdx: number, eIdx: number) => {
    setWorkout((prev) => {
      const newSections: TrainerWorkoutSection[] = structuredClone(
        prev.sections
      );
      const exercise = newSections[sIdx]?.exercises[eIdx];
      if (exercise) {
        exercise.setDetails.push({
          reps: "",
          weight: "",
          rest: "",
          notes: "",
          isUserAdded: true,
        });
        exercise.sets = exercise.setDetails.length;
      }
      return { ...prev, sections: newSections };
    });
  }, []);

  const handleExerciseComplete = useCallback(
    (sIdx: number, eIdx: number, completed: boolean) => {
      // Only update local state - don't persist to Firestore yet
      // Exercise completions will be saved when the workout is marked as complete

      // Validate: require at least one completed set before marking exercise complete
      // Validate before calling setState to avoid side effects in state update
      if (completed === true) {
        // Validate using current state before updating
        const exercise = workout.sections?.[sIdx]?.exercises?.[eIdx];
        const hasCompletedSet =
          exercise?.setDetails?.some(
            (s) => (s as unknown as Record<string, unknown>).completed === true
          ) ?? false;

        if (!hasCompletedSet) {
          // Validation failed - show toast immediately and return without updating state
          toast.error(
            "Please complete at least one set before completing the exercise"
          );
          return;
        }
      }

      // Validation passed (or not needed for uncompleting) - proceed with update
      setWorkout((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        const exercise = newSections[sIdx]?.exercises[eIdx];
        if (exercise) {
          exercise.completed = completed;
        }
        return { ...prev, sections: newSections };
      });
    },
    [workout.sections]
  );

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(workout);
      setHasSaved(true);
      setWeightSaveMessage("Saved!");
      setTimeout(() => setWeightSaveMessage(null), 2000);
    } catch (error) {
      console.error("Failed to save workout:", error);
      setWeightSaveMessage("Save failed");
      setTimeout(() => setWeightSaveMessage(null), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, workout]);

  const handleRetryImage = useCallback(
    async (sectionIdx: number, exerciseIdx: number) => {
      if (!user) {
        toast.error("You must be logged in to generate images");
        return;
      }

      // Use ref to get latest workout without causing callback recreation
      const currentWorkout = workoutRef.current;
      const exercise =
        currentWorkout.sections[sectionIdx]?.exercises[exerciseIdx];
      if (!exercise) return;

      const key = `${sectionIdx}-${exerciseIdx}`;
      setRetryingImageKey(key);

      try {
        const idToken = await user.getIdToken();
        const result = await generateExerciseImage(
          exercise,
          currentWorkout.id,
          idToken
        );

        if (result) {
          // Update the workout with the new image
          setWorkout((prev) => {
            const newSections: TrainerWorkoutSection[] = structuredClone(
              prev.sections
            );
            if (newSections[sectionIdx]?.exercises[exerciseIdx]) {
              newSections[sectionIdx].exercises[exerciseIdx].image_url =
                result.url;
              newSections[sectionIdx].exercises[exerciseIdx].image_source =
                "generated";
            }
            return { ...prev, sections: newSections, has_images: true };
          });
          toast.success(`Image generated for ${exercise.name}`);
        } else {
          toast.error(`Could not generate image for ${exercise.name}`);
        }
      } catch (error) {
        console.error("Retry image error:", error);
        toast.error("Failed to generate image");
      } finally {
        setRetryingImageKey(null);
      }
    },
    [user]
  );

  const handleOpenAIEditor = useCallback((sIdx: number, eIdx: number) => {
    setAIEditorState({ open: true, sectionIdx: sIdx, exerciseIdx: eIdx });
  }, []);

  const handleOpenCoachExplain = useCallback((sIdx: number, eIdx: number) => {
    setAIEditorState({
      open: true,
      sectionIdx: sIdx,
      exerciseIdx: eIdx,
      initialAction: "coach_explain",
    });
  }, []);

  const handleChooseImage = useCallback((sIdx: number, eIdx: number) => {
    setImageSelectorState({
      open: true,
      sectionIdx: sIdx,
      exerciseIdx: eIdx,
    });
  }, []);

  const handleOpenAddExercise = useCallback((sIdx: number, eIdx: number) => {
    setAIEditorState({
      open: true,
      sectionIdx: sIdx,
      exerciseIdx: eIdx,
      initialAction: "add",
    });
  }, []);

  const handleCheckOrder = useCallback(
    async (sIdx: number, eIdx: number) => {
      if (!workout.id) return;
      setOrderCheckState((prev) => ({
        ...prev,
        open: true,
        loading: true,
        result: null,
        error: null,
        sectionIdx: sIdx,
        exerciseIdx: eIdx,
      }));
      try {
        const res = await AIExerciseService.checkExerciseOrder(
          workout.id,
          sIdx,
          eIdx
        );
        setOrderCheckState((prev) => ({
          ...prev,
          loading: false,
          result: res,
          error: null,
        }));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to check exercise order";
        setOrderCheckState((prev) => ({
          ...prev,
          loading: false,
          result: null,
          error: msg,
        }));
        toast.error(msg);
      }
    },
    [workout.id]
  );

  const handleReorderExercises = useCallback(
    async (
      sectionIdx: number,
      reorderedExercises: TrainerWorkoutExercise[]
    ) => {
      if (!user || !workout.id) return;
      const originalSections: TrainerWorkoutSection[] = structuredClone(
        workoutRef.current.sections ?? []
      );
      try {
        setWorkout((prev) => {
          const next = structuredClone(prev);
          if (!next.sections[sectionIdx]) return prev;
          next.sections[sectionIdx] = {
            ...next.sections[sectionIdx]!,
            exercises: reorderedExercises,
          };
          return { ...prev, sections: next.sections };
        });
        const idToken = await user.getIdToken();
        const res = await fetch("/api/workouts/reorder-exercises", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            workout_id: workout.id,
            section_index: sectionIdx,
            reordered_exercises: reorderedExercises,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { message?: string }).message || "Failed to reorder"
          );
        }
        toast.success("Exercise order updated");
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "Failed to reorder exercises";
        console.error(
          "[WorkoutDisplay] Reorder exercises error:",
          errorMessage
        );
        setWorkout((prev) => ({ ...prev, sections: originalSections }));
        toast.error(errorMessage);
      }
    },
    [user, workout.id]
  );

  const handleMoveToSuggested = useCallback(
    (sectionIdx: number, exerciseIdx: number, suggestedPosition: number) => {
      const sections = workoutRef.current.sections ?? [];
      const section = sections[sectionIdx];
      if (!section?.exercises) return;
      const exercises = [...section.exercises];
      const [moved] = exercises.splice(exerciseIdx, 1);
      if (!moved) return;
      exercises.splice(suggestedPosition, 0, moved);
      void handleReorderExercises(sectionIdx, exercises);
    },
    [handleReorderExercises]
  );

  const handleUpdateImageUrl = useCallback(
    async (imageUrl: string) => {
      if (
        aiEditorState.sectionIdx === null ||
        aiEditorState.exerciseIdx === null
      ) {
        return;
      }

      const sIdx = aiEditorState.sectionIdx;
      const eIdx = aiEditorState.exerciseIdx;

      // Update the workout with the new image URL
      setWorkout((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections
        );
        if (newSections[sIdx]?.exercises[eIdx]) {
          newSections[sIdx].exercises[eIdx].image_url = imageUrl;
          newSections[sIdx].exercises[eIdx].image_source = "generated";
        }
        return { ...prev, sections: newSections, has_images: true };
      });
    },
    [aiEditorState.sectionIdx, aiEditorState.exerciseIdx]
  );

  const handleApplyAIEdit = useCallback(
    async (
      modifiedExercise: TrainerWorkoutExercise,
      editHistory: ExerciseAIEditHistory
    ) => {
      if (
        aiEditorState.sectionIdx === null ||
        aiEditorState.exerciseIdx === null
      ) {
        return;
      }

      const sIdx = aiEditorState.sectionIdx;
      const eIdx = aiEditorState.exerciseIdx;

      // Capture original sections before optimistic update for potential revert
      // Use workoutRef to avoid stale closure issues
      const originalSections: TrainerWorkoutSection[] = structuredClone(
        workoutRef.current.sections ?? []
      );

      try {
        // Optimistically update UI
        setWorkout((prev) => {
          const newSections: TrainerWorkoutSection[] = structuredClone(
            prev.sections
          );
          if (newSections[sIdx]?.exercises[eIdx]) {
            newSections[sIdx].exercises[eIdx] = modifiedExercise;
          }
          return { ...prev, sections: newSections };
        });

        // Persist to Firestore via API
        await AIExerciseService.applyExerciseEdit(
          workout.id,
          sIdx,
          eIdx,
          modifiedExercise,
          editHistory
        );

        // Update ref to match persisted state
        workoutRef.current = {
          ...workoutRef.current,
          sections: (workoutRef.current.sections || []).map((section, sidx) => {
            if (sidx === sIdx) {
              return {
                ...section,
                exercises: (section.exercises || []).map((exercise, eidx) =>
                  eidx === eIdx ? modifiedExercise : exercise
                ),
              };
            }
            return section;
          }),
        };

        toast.success("Exercise updated with AI!");
        setAIEditorState({ open: false, sectionIdx: null, exerciseIdx: null });
      } catch (error) {
        console.error("Error applying AI edit:", error);
        toast.error("Failed to apply edit. Please try again.");
        // Revert optimistic update on error using captured original state
        setWorkout((prev) => ({
          ...prev,
          sections: structuredClone(originalSections),
        }));
      }
    },
    [workout.id, aiEditorState]
  );

  const handleApplyAddExercise = useCallback(
    async (
      newExercise: TrainerWorkoutExercise,
      editHistory: ExerciseAIAddHistoryEntry,
      insertPosition: "before" | "after"
    ) => {
      if (
        aiEditorState.sectionIdx === null ||
        aiEditorState.exerciseIdx === null
      ) {
        return;
      }
      const sIdx = aiEditorState.sectionIdx;
      const eIdx = aiEditorState.exerciseIdx;
      const insert_position = insertPosition === "before" ? eIdx : eIdx + 1;

      const originalSections: TrainerWorkoutSection[] = structuredClone(
        workoutRef.current.sections ?? []
      );

      try {
        setWorkout((prev) => {
          const newSections: TrainerWorkoutSection[] = structuredClone(
            prev.sections
          );
          const section = newSections[sIdx];
          if (!section?.exercises) return prev;
          const next = [...section.exercises];
          next.splice(insert_position, 0, newExercise);
          newSections[sIdx] = { ...section, exercises: next };
          return { ...prev, sections: newSections };
        });

        await AIExerciseService.applyExerciseAdd(
          workout.id,
          sIdx,
          insert_position,
          newExercise,
          editHistory
        );

        toast.success("Exercise added!");
        setAIEditorState({ open: false, sectionIdx: null, exerciseIdx: null });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Failed to add exercise.";
        toast.error(msg);
        setWorkout((prev) => ({ ...prev, sections: originalSections }));
      }
    },
    [workout.id, aiEditorState.sectionIdx, aiEditorState.exerciseIdx]
  );

  if (!workout.sections || workout.sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No workout sections available.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto relative">
      <WorkoutHeader
        workout={workout}
        isSaving={isSaving}
        hasSaved={hasSaved}
        onSave={handleSave}
      />

      <div className="space-y-12">
        {workout.sections.map((section, sIdx) => (
          <WorkoutSection
            key={`${section.type}-${sIdx}`}
            section={section}
            sectionIdx={sIdx}
            onExerciseClick={handleOpenModal}
            onUpdateSet={handleUpdateSet}
            onToggleSetComplete={handleSetComplete}
            onRetryImage={tier !== "free" ? handleRetryImage : undefined}
            retryingImageKey={retryingImageKey}
            onExerciseComplete={handleExerciseComplete}
            onOpenAIEditor={isEditing ? handleOpenAIEditor : undefined}
            onOpenCoachExplain={isEditing ? handleOpenCoachExplain : undefined}
            onChooseImage={isEditing ? handleChooseImage : undefined}
            onOpenAddExercise={isEditing ? handleOpenAddExercise : undefined}
            onCheckOrder={isEditing ? handleCheckOrder : undefined}
            onReorderExercises={isEditing ? handleReorderExercises : undefined}
            isEditing={isEditing}
            disableReorder={isSaving}
          />
        ))}
      </div>

      <PersonalizationCard personalization={workout.personalization} />

      {/* Image Generation Section - Only show for Pro/Elite tiers */}
      {isEditing && tier !== "free" && (
        <div className="mt-8 p-6 bg-muted/30 rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Exercise Images</h3>
              <p className="text-sm text-muted-foreground">
                {workout.has_images
                  ? "This workout has certified exercise demonstration images."
                  : "Request certified images through the coach review process."}
              </p>
            </div>
            {/* 
              Note: onRequestImages opens the certification workflow modal, not direct image generation.
              This is intentional - images are now only available through the certification process.
              See docs/design/IMAGE_GENERATION_DESIGN_DECISION.md for details.
            */}
            <ImageGenerationButton
              workout={workout}
              disabled={isSaving}
              onRequestImages={onRequestImages}
            />
          </div>
        </div>
      )}

      {isEditing && (
        <ExerciseModal
          sections={workout.sections}
          activeIndices={activeExercise}
          onClose={handleCloseModal}
          onNavigate={handleNavigateModal}
          onUpdateSet={handleUpdateSet}
          onAddSet={handleAddSet}
          onSaveWeights={handleSave}
          weightSaveMessage={weightSaveMessage}
          onToggleSetComplete={handleSetComplete}
        />
      )}

      {/* AI Exercise Editor */}
      {isEditing &&
        aiEditorState.open &&
        aiEditorState.sectionIdx !== null &&
        aiEditorState.exerciseIdx !== null &&
        workout.sections?.[aiEditorState.sectionIdx]?.exercises?.[
          aiEditorState.exerciseIdx
        ] && (
          <AIExerciseEditor
            exercise={
              workout.sections[aiEditorState.sectionIdx].exercises[
                aiEditorState.exerciseIdx
              ]
            }
            sectionType={
              workout.sections[aiEditorState.sectionIdx]?.type || "Workout"
            }
            sectionIndex={aiEditorState.sectionIdx}
            exerciseIndex={aiEditorState.exerciseIdx}
            workoutId={workout.id}
            workout={{
              focus: workout.focus,
              difficulty: workout.difficulty,
              generation_context: workout.generation_context,
              sections: workout.sections.map((s) => ({
                type: s.type || "Workout",
                durationEstimate: s.durationEstimate || "",
                exercises: (s.exercises || []).map((e) => ({
                  name: e.name,
                  sets: e.sets,
                  muscleTarget: e.muscleTarget,
                  tempo: e.tempo,
                  cues: e.cues,
                  detailedInstructions: e.detailedInstructions,
                  setDetails: e.setDetails,
                  equipment_needed: e.equipment_needed,
                  muscle_groups: e.muscle_groups,
                  image_url: e.image_url,
                })),
              })),
            }}
            open={aiEditorState.open}
            onOpenChange={(open) =>
              setAIEditorState((prev) => ({
                ...prev,
                open,
                ...(open === false
                  ? {
                      sectionIdx: null,
                      exerciseIdx: null,
                      initialAction: undefined,
                    }
                  : {}),
              }))
            }
            onApplyEdit={handleApplyAIEdit}
            onApplyAdd={handleApplyAddExercise}
            onUpdateImageUrl={handleUpdateImageUrl}
            initialAction={aiEditorState.initialAction}
          />
        )}

      {/* Exercise Order Check Result */}
      {isEditing && (
        <ExerciseOrderCheckResult
          open={orderCheckState.open}
          onOpenChange={(open) =>
            setOrderCheckState((prev) => ({
              ...prev,
              open,
              ...(open === false
                ? {
                    loading: false,
                    result: null,
                    error: null,
                    sectionIdx: null,
                    exerciseIdx: null,
                  }
                : {}),
            }))
          }
          result={orderCheckState.result}
          loading={orderCheckState.loading}
          error={orderCheckState.error}
          exerciseName={
            orderCheckState.sectionIdx != null &&
            orderCheckState.exerciseIdx != null &&
            workout.sections?.[orderCheckState.sectionIdx]?.exercises?.[
              orderCheckState.exerciseIdx
            ]
              ? workout.sections[orderCheckState.sectionIdx].exercises[
                  orderCheckState.exerciseIdx
                ].name
              : undefined
          }
          sectionIdx={orderCheckState.sectionIdx ?? undefined}
          exerciseIdx={orderCheckState.exerciseIdx ?? undefined}
          onMoveToSuggested={handleMoveToSuggested}
        />
      )}

      {/* Exercise Image Selector Modal */}
      {isEditing &&
        imageSelectorState.open &&
        imageSelectorState.sectionIdx !== null &&
        imageSelectorState.exerciseIdx !== null &&
        workout.sections?.[imageSelectorState.sectionIdx]?.exercises?.[
          imageSelectorState.exerciseIdx
        ] && (
          <ExerciseImageSelectorModal
            open={imageSelectorState.open}
            onOpenChange={(open) =>
              setImageSelectorState((prev) => ({
                ...prev,
                open,
                ...(open === false
                  ? {
                      sectionIdx: null,
                      exerciseIdx: null,
                    }
                  : {}),
              }))
            }
            exerciseName={
              workout.sections[imageSelectorState.sectionIdx].exercises[
                imageSelectorState.exerciseIdx
              ].name
            }
            currentImageUrl={
              workout.sections[imageSelectorState.sectionIdx].exercises[
                imageSelectorState.exerciseIdx
              ].image_url
            }
            onImageSelected={() => {
              // Image preference is saved by the modal (which shows its own success toast).
              // The preference will be picked up automatically via useExerciseImage hook.
              // No need for duplicate toast - modal already provides user feedback.
            }}
          />
        )}
    </div>
  );
}
