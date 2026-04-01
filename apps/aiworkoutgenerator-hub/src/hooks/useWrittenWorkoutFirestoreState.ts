"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type {
  TrainerWorkout,
  TrainerWorkoutSection,
  TrainerSetDetail,
} from "@/types/firestore";
import { TrainerService } from "@/services/trainer/TrainerService";
import { devLogError } from "@/lib/devLog";
import { exerciseHasCompletedSet } from "@/lib/workout/exerciseCompletion";

const SAVE_DEBOUNCE_MS = 800;

export function useWrittenWorkoutFirestoreState(
  initialWorkout: TrainerWorkout
) {
  const [workoutState, setWorkoutState] =
    useState<TrainerWorkout>(initialWorkout);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef<TrainerWorkoutSection[]>(
    initialWorkout.sections || []
  );

  useEffect(() => {
    sectionsRef.current = workoutState.sections || [];
  }, [workoutState.sections]);

  useEffect(() => {
    setWorkoutState(initialWorkout);
    // Only when switching workouts (parent uses key={workout.id}); avoid resetting on refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [initialWorkout.id]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [initialWorkout.id]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      const sections = sectionsRef.current;
      if (!workoutState.id || !sections.length) return;
      try {
        await TrainerService.updateWorkoutSections(workoutState.id, sections);
        toast.success("Workout progress saved.", { duration: 2000 });
      } catch (error) {
        devLogError("WrittenWorkout.save", error);
        toast.error("Could not save workout progress. Please try again.");
      }
    }, SAVE_DEBOUNCE_MS);
  }, [workoutState.id]);

  const ensureSetDetailsLength = useCallback(
    (
      sections: TrainerWorkoutSection[],
      sIdx: number,
      eIdx: number,
      minLength: number
    ): TrainerWorkoutSection[] => {
      const section = sections[sIdx];
      if (!section?.exercises) return sections;
      const exercise = section.exercises[eIdx];
      if (!exercise) return sections;
      const details = exercise.setDetails || [];
      if (details.length >= minLength) return sections;

      const padded = [...details];
      const lastSet = details[details.length - 1] || {
        reps: "",
        weight: "",
        rest: "60s",
      };
      while (padded.length < minLength) {
        padded.push({ ...lastSet, reps: "", weight: "" });
      }

      const newSections = [...sections];
      newSections[sIdx] = { ...section };
      newSections[sIdx].exercises = [...section.exercises];
      newSections[sIdx].exercises[eIdx] = {
        ...exercise,
        setDetails: padded,
      };
      return newSections;
    },
    []
  );

  const handleSetComplete = useCallback(
    (sIdx: number, eIdx: number, setIdx: number, completed: boolean) => {
      setWorkoutState((prev) => {
        const sections = prev.sections || [];
        const section = sections[sIdx];
        if (!section?.exercises) return prev;
        const exercise = section.exercises[eIdx];
        if (!exercise?.setDetails || setIdx >= exercise.setDetails.length)
          return prev;

        const newSections = structuredClone(sections);
        const targetExercise = newSections[sIdx].exercises[eIdx];
        if (targetExercise.setDetails[setIdx]) {
          targetExercise.setDetails[setIdx].completed = completed;
        }
        if (targetExercise.setDetails?.length) {
          const allDone = targetExercise.setDetails.every(
            (s) => s.completed === true
          );
          targetExercise.completed = allDone;
        }
        return { ...prev, sections: newSections };
      });
      debouncedSave();
    },
    [debouncedSave]
  );

  const handleExerciseComplete = useCallback(
    (sIdx: number, eIdx: number, completed: boolean) => {
      if (completed) {
        const ex = workoutState.sections?.[sIdx]?.exercises?.[eIdx];
        if (!exerciseHasCompletedSet(ex)) {
          toast.error(
            "Please complete at least one set before completing the exercise"
          );
          return;
        }
      }
      setWorkoutState((prev) => {
        const sections = prev.sections || [];
        const newSections = structuredClone(sections);
        const exercise = newSections[sIdx]?.exercises?.[eIdx];
        if (exercise) {
          exercise.completed = completed;
        }
        return { ...prev, sections: newSections };
      });
      debouncedSave();
    },
    [workoutState.sections, debouncedSave]
  );

  const handleSetFieldUpdate = useCallback(
    (
      sIdx: number,
      eIdx: number,
      setIdx: number,
      field: keyof TrainerSetDetail,
      value: string | boolean
    ) => {
      setWorkoutState((prev) => {
        let sections = prev.sections || [];
        sections = ensureSetDetailsLength(sections, sIdx, eIdx, setIdx + 1);
        const section = sections[sIdx];
        const exercise = section?.exercises[eIdx];
        if (!exercise?.setDetails) return prev;

        const newSections = structuredClone(sections);
        const targetExercise = newSections[sIdx].exercises[eIdx];
        const targetSet = targetExercise.setDetails[setIdx];
        if (targetSet) {
          if (field === "completed" && typeof value === "boolean") {
            targetSet.completed = value;
          } else if (
            typeof value === "string" &&
            (field === "reps" ||
              field === "weight" ||
              field === "actualWeight" ||
              field === "rest" ||
              field === "notes")
          ) {
            targetSet[field] = value;
          }
        }
        return { ...prev, sections: newSections };
      });
      debouncedSave();
    },
    [debouncedSave, ensureSetDetailsLength]
  );

  const handleUpdateSetString = useCallback(
    (
      sIdx: number,
      eIdx: number,
      setIdx: number,
      field: string,
      value: string
    ) => {
      if (
        field !== "reps" &&
        field !== "weight" &&
        field !== "actualWeight" &&
        field !== "rest" &&
        field !== "notes"
      ) {
        return;
      }
      handleSetFieldUpdate(
        sIdx,
        eIdx,
        setIdx,
        field as keyof TrainerSetDetail,
        value
      );
    },
    [handleSetFieldUpdate]
  );

  const handleAddSet = useCallback(
    (sIdx: number, eIdx: number) => {
      setWorkoutState((prev) => {
        const newSections: TrainerWorkoutSection[] = structuredClone(
          prev.sections || []
        );
        const exercise = newSections[sIdx]?.exercises[eIdx];
        if (exercise) {
          exercise.setDetails = exercise.setDetails || [];
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
      debouncedSave();
    },
    [debouncedSave]
  );

  return {
    workoutState,
    setWorkoutState,
    handleUpdateSetString,
    handleSetComplete,
    handleExerciseComplete,
    handleAddSet,
  };
}
