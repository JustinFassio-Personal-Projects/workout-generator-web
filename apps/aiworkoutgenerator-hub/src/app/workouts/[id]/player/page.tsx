"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useTrainerWorkout } from "@/hooks/useTrainerWorkout";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import { WorkoutPlayer } from "@/components/workout/player/WorkoutPlayer";
import WorkoutPlayerLoading from "./loading";

function WorkoutPlayerContent() {
  const params = useParams();
  const workoutId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const { sessionId } = useSession();
  const {
    workout,
    loading: workoutLoading,
    error,
  } = useTrainerWorkout(workoutId || "");
  const hasLoggedWorkoutRef = useRef<string | null>(null);

  // Redirect if not authenticated or onboarding not completed
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  // Log workout opening when workout is successfully loaded (once per workout)
  useEffect(() => {
    if (workout?.id && user && !workoutLoading) {
      // Only log if we haven't already logged this workout
      if (hasLoggedWorkoutRef.current !== workout.id) {
        hasLoggedWorkoutRef.current = workout.id;
        logUserActivity(
          user.uid,
          "workout:open",
          "workout",
          workoutId,
          {},
          sessionId || undefined
        ).catch(console.error);
      }
    }
  }, [workout?.id, user, workoutLoading, workoutId, sessionId]);

  // Loading state
  if (authLoading || profileLoading || workoutLoading) {
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

  return <WorkoutPlayer workout={workout} />;
}

export default function WorkoutPlayerPage() {
  return (
    <Suspense fallback={<WorkoutPlayerLoading />}>
      <WorkoutPlayerContent />
    </Suspense>
  );
}
