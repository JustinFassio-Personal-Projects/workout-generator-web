"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  TrainerWorkout,
  TrainerWorkoutSection,
  TrainerSetDetail,
} from "@/types/firestore";

interface UseWorkoutEditorOptions {
  onSave?: (workout: TrainerWorkout) => Promise<void>;
}

interface UseWorkoutEditorReturn {
  workout: TrainerWorkout;
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  updateSet: (
    sectionIdx: number,
    exerciseIdx: number,
    setIdx: number,
    field: keyof TrainerSetDetail,
    value: string
  ) => void;
  addSet: (sectionIdx: number, exerciseIdx: number) => void;
  removeSet: (sectionIdx: number, exerciseIdx: number, setIdx: number) => void;
  saveWorkout: () => Promise<boolean>;
  resetWorkout: () => void;
  hasUserAddedSets: boolean;
}

/**
 * Hook for managing workout editing state, including weight tracking
 * and set management.
 */
export function useWorkoutEditor(
  initialWorkout: TrainerWorkout,
  options: UseWorkoutEditorOptions = {}
): UseWorkoutEditorReturn {
  const { onSave } = options;

  const [workout, setWorkout] = useState<TrainerWorkout>(initialWorkout);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Deep clone sections to avoid mutation.
   * Uses structuredClone for proper handling of all data types.
   */
  const cloneSections = useCallback(
    (sections: TrainerWorkoutSection[]): TrainerWorkoutSection[] => {
      return structuredClone(sections);
    },
    []
  );

  /**
   * Update a specific field in a set.
   */
  const updateSet = useCallback(
    (
      sectionIdx: number,
      exerciseIdx: number,
      setIdx: number,
      field: keyof TrainerSetDetail,
      value: string
    ) => {
      setWorkout((prev) => {
        const newSections = cloneSections(prev.sections);
        const set =
          newSections[sectionIdx]?.exercises[exerciseIdx]?.setDetails[setIdx];
        if (set) {
          (set as unknown as Record<string, unknown>)[field] = value;
        }
        return { ...prev, sections: newSections };
      });
      setIsDirty(true);
      setSaveError(null);
    },
    [cloneSections]
  );

  /**
   * Add a new empty set to an exercise.
   */
  const addSet = useCallback(
    (sectionIdx: number, exerciseIdx: number) => {
      setWorkout((prev) => {
        const newSections = cloneSections(prev.sections);
        const exercise = newSections[sectionIdx]?.exercises[exerciseIdx];
        if (exercise) {
          const newSet: TrainerSetDetail = {
            reps: "",
            weight: "",
            rest: "60s",
            notes: "",
            isUserAdded: true,
          };
          exercise.setDetails.push(newSet);
          exercise.sets = exercise.setDetails.length;
        }
        return { ...prev, sections: newSections };
      });
      setIsDirty(true);
      setSaveError(null);
    },
    [cloneSections]
  );

  /**
   * Remove a set from an exercise.
   */
  const removeSet = useCallback(
    (sectionIdx: number, exerciseIdx: number, setIdx: number) => {
      setWorkout((prev) => {
        const newSections = cloneSections(prev.sections);
        const exercise = newSections[sectionIdx]?.exercises[exerciseIdx];
        if (exercise && exercise.setDetails.length > 1) {
          exercise.setDetails.splice(setIdx, 1);
          exercise.sets = exercise.setDetails.length;
        }
        return { ...prev, sections: newSections };
      });
      setIsDirty(true);
      setSaveError(null);
    },
    [cloneSections]
  );

  /**
   * Save the workout.
   */
  const saveWorkout = useCallback(async (): Promise<boolean> => {
    if (!onSave) return false;

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(workout);
      setIsDirty(false);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save workout";
      setSaveError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onSave, workout]);

  /**
   * Reset workout to initial state.
   */
  const resetWorkout = useCallback(() => {
    setWorkout(initialWorkout);
    setIsDirty(false);
    setSaveError(null);
  }, [initialWorkout]);

  /**
   * Check if any user-added sets exist.
   */
  const hasUserAddedSets = useMemo(() => {
    return (
      workout.sections?.some((section) =>
        section.exercises?.some((exercise) =>
          exercise.setDetails?.some((set) => set.isUserAdded)
        )
      ) ?? false
    );
  }, [workout.sections]);

  return {
    workout,
    isDirty,
    isSaving,
    saveError,
    updateSet,
    addSet,
    removeSet,
    saveWorkout,
    resetWorkout,
    hasUserAddedSets,
  };
}
