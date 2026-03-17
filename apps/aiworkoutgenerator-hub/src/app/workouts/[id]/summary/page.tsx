"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/auth";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useTrainerWorkout } from "@/hooks/useTrainerWorkout";
import { WorkoutSessionSummary } from "@/components/session/WorkoutSessionSummary";

function WorkoutSummaryContent() {
  const params = useParams();
  const workoutId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const {
    workout,
    loading: workoutLoading,
    error,
  } = useTrainerWorkout(workoutId || "");

  if (!workoutId) {
    return null;
  }

  // Redirect if not authenticated or onboarding not completed
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  if (!profileLoading && !completed) {
    router.push("/onboarding");
    return null;
  }

  // Loading state
  if (authLoading || profileLoading || workoutLoading) {
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

  if (!workout) {
    return (
      <div className="container mx-auto py-8 max-w-4xl px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workout not found</p>
        </div>
      </div>
    );
  }

  return <WorkoutSessionSummary workout={workout} />;
}

export default function WorkoutSummaryPage() {
  return (
    <Suspense fallback={null}>
      <WorkoutSummaryContent />
    </Suspense>
  );
}
