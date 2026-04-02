"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useTrainerWorkout } from "@/hooks/useTrainerWorkout";
import { useSession } from "@/lib/session-tracker";
import { useLogWorkoutOpenActivity } from "@/hooks/useLogWorkoutOpenActivity";
import { ManualWorkoutPlayer } from "@/components/workout/player/ManualWorkoutPlayer";
import WorkoutPlayerLoading from "./loading";
import {
  WorkoutAnalyticsAttemptProvider,
  useWorkoutAnalyticsAttempt,
} from "@/contexts/WorkoutAnalyticsAttemptContext";

function WorkoutPlayerContent() {
  const params = useParams();
  const workoutId = params.id as string;
  const analytics = useWorkoutAnalyticsAttempt();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const { sessionId } = useSession();
  const {
    workout,
    loading: workoutLoading,
    error,
  } = useTrainerWorkout(workoutId || "");
  /** True only while we have no workout yet (initial Firestore load). */
  const workoutInitialLoad = workoutLoading && !workout;

  // Redirect if not authenticated or onboarding not completed
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  useLogWorkoutOpenActivity({
    workoutDocumentId: workout?.id,
    userId: user?.uid,
    workoutInitialLoad,
    sessionId: sessionId || undefined,
    analytics,
  });

  // Initial load only — do not unmount the player when `workoutLoading` is true
  // due to background image mapping after a save (that would reset block session UI).
  if (authLoading || profileLoading || workoutInitialLoad) {
    return null; // Loading handled by Suspense boundary
  }

  // Redirect will happen
  if (!user || !completed) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-4xl px-4">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load workout</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // No workout found
  if (!workout) {
    return (
      <div className="container mx-auto py-8 max-w-4xl px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workout not found</p>
        </div>
      </div>
    );
  }

  return <ManualWorkoutPlayer workout={workout} />;
}

function WorkoutPlayerOuter() {
  const params = useParams();
  const workoutId = (params.id as string) || "";
  return (
    <WorkoutAnalyticsAttemptProvider
      key={workoutId}
      workoutId={workoutId}
      surface="workout_player"
    >
      <WorkoutPlayerContent />
    </WorkoutAnalyticsAttemptProvider>
  );
}

export default function WorkoutPlayerPage() {
  return (
    <Suspense fallback={<WorkoutPlayerLoading />}>
      <WorkoutPlayerOuter />
    </Suspense>
  );
}
