"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { trackWorkoutDetailsTourReplayRequested } from "@/lib/workout-details-tour-analytics";
import { buildWorkoutDetailsTourReplayResetPatch } from "@/lib/workout-details-tour-version";
import type { UserProfile } from "@/types/firestore";

export type WorkoutDetailsTourReplaySource =
  | "profile_manual"
  | "workout_details";

export function useReplayWorkoutDetailsTour(
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
) {
  const [busy, setBusy] = useState(false);

  const replay = useCallback(
    async (source: WorkoutDetailsTourReplaySource) => {
      setBusy(true);
      try {
        trackWorkoutDetailsTourReplayRequested(source);
        await updateProfile(buildWorkoutDetailsTourReplayResetPatch());
        toast.success("Open any workout to start the tour.", {
          description:
            "The guided tour runs on desktop when you open workout details (wide screen, 1024px+).",
        });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not reset tour progress";
        toast.error(msg);
      } finally {
        setBusy(false);
      }
    },
    [updateProfile]
  );

  return { busy, replay };
}
