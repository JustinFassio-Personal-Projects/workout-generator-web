"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useTrainerWorkout } from "@/hooks/useTrainerWorkout";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import { WrittenWorkoutView } from "@/components/workout/written/WrittenWorkoutView";
import WrittenWorkoutLoading from "./loading";

function WrittenWorkoutContent() {
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
  const workoutInitialLoad = workoutLoading && !workout;
  const hasLoggedWorkoutRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  useEffect(() => {
    if (workout?.id && user && !workoutInitialLoad) {
      if (hasLoggedWorkoutRef.current !== workout.id) {
        hasLoggedWorkoutRef.current = workout.id;
        void logUserActivity(
          user.uid,
          "workout:open",
          "workout",
          workoutId,
          { surface: "written_sheet" },
          sessionId || undefined
        ).catch(() => {
          /* non-blocking */
        });
      }
    }
  }, [workout?.id, user, workoutInitialLoad, workoutId, sessionId]);

  if (authLoading || profileLoading || workoutInitialLoad) {
    return <WrittenWorkoutLoading />;
  }

  if (!user || !completed) {
    return null;
  }

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

  if (!workout) {
    return (
      <div className="container mx-auto py-8 max-w-4xl px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workout not found</p>
        </div>
      </div>
    );
  }

  return (
    <WrittenWorkoutView key={workout.id} workout={workout} userId={user.uid} />
  );
}

export default function WrittenWorkoutPage() {
  return (
    <Suspense fallback={<WrittenWorkoutLoading />}>
      <WrittenWorkoutContent />
    </Suspense>
  );
}
