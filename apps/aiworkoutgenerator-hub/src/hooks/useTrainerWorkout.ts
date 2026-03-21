"use client";

import { useEffect, useState, useRef } from "react";
import { onSnapshot } from "firebase/firestore";

import type { TrainerWorkout } from "@/types/firestore";
import { TrainerService } from "@/services/trainer/TrainerService";
import { useUser } from "@/lib/auth";
import { mapWorkoutImages } from "@/services/image/ImageMappingService.client";

export function useTrainerWorkout(workoutId: string) {
  const { user, loading: authLoading } = useUser();
  const [state, setState] = useState<{
    workout: TrainerWorkout | null;
    loading: boolean;
    error: string | null;
  }>({ workout: null, loading: true, error: null });
  const [imagesMapping, setImagesMapping] = useState(false);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!workoutId) return;

    // Reset mounted flag and request counter
    isMountedRef.current = true;
    requestIdRef.current = 0;

    const ref = TrainerService.workoutDoc(workoutId);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        // Increment request ID to track the latest request
        const currentRequestId = ++requestIdRef.current;

        if (!snap.exists()) {
          // Only update state if this is still the latest request and component is mounted
          if (
            currentRequestId === requestIdRef.current &&
            isMountedRef.current
          ) {
            setState({
              workout: null,
              loading: false,
              error: null,
            });
          }
          return;
        }

        let workout = snap.data() as TrainerWorkout;

        // SAFEGUARD: If sections was corrupted to an object (due to Firestore dot notation),
        // convert it back to an array. This can happen if sections.N.field was used in an update.
        if (workout.sections && !Array.isArray(workout.sections)) {
          const sectionsObj = workout.sections as unknown as Record<
            string,
            unknown
          >;
          const sectionsArray = Object.keys(sectionsObj)
            .filter((key) => !isNaN(Number(key)))
            .sort((a, b) => Number(a) - Number(b))
            .map(
              (key) => sectionsObj[key] as TrainerWorkout["sections"][number]
            );

          workout = {
            ...workout,
            sections: sectionsArray as TrainerWorkout["sections"],
          };
        }

        // Map images from master_exercise_images
        // Only map if workout has sections and at least one exercise is missing an image
        const needsMapping =
          workout.sections &&
          Array.isArray(workout.sections) &&
          workout.sections.some((section) =>
            section.exercises?.some((exercise) => !exercise.image_url)
          );

        if (needsMapping) {
          // Only proceed if this is still the latest request
          if (currentRequestId !== requestIdRef.current) {
            return; // Stale request, ignore
          }

          if (isMountedRef.current) {
            setImagesMapping(true);
          }

          try {
            const workoutWithImages = await mapWorkoutImages(workout, user);

            // Only update state if this is still the latest request and component is mounted
            if (
              currentRequestId === requestIdRef.current &&
              isMountedRef.current
            ) {
              setState({
                workout: workoutWithImages,
                loading: false,
                error: null,
              });
            } else {
              // Request was stale, log for debugging
              console.warn(
                "Image mapping completed but request was stale, ignoring result"
              );
            }
          } catch (error) {
            // If image mapping fails, still return the workout without images
            // Only update if this is still the latest request and component is mounted
            if (
              currentRequestId === requestIdRef.current &&
              isMountedRef.current
            ) {
              console.error("Error mapping workout images:", error);
              setState({
                workout,
                loading: false,
                error: null,
              });
            }
          } finally {
            // Only update mapping state if component is still mounted
            if (isMountedRef.current) {
              setImagesMapping(false);
            }
          }
        } else {
          // Workout already has all images or no exercises to map
          // Only update state if this is still the latest request and component is mounted
          if (
            currentRequestId === requestIdRef.current &&
            isMountedRef.current
          ) {
            setState({
              workout,
              loading: false,
              error: null,
            });
          }
        }
      },
      (err) => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setState({
            workout: null,
            loading: false,
            error: err?.message ?? "Failed to load workout",
          });
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      unsub();
    };
  }, [authLoading, user, workoutId]);

  const loading = authLoading || state.loading || imagesMapping;
  return {
    workout: state.workout,
    loading,
    loadingImages: imagesMapping,
    error: state.error,
  };
}
