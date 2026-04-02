"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  RefreshCw,
  Sparkles,
  Play,
  ScrollText,
  Smartphone,
} from "lucide-react";

import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useReplayWorkoutDetailsTour } from "@/hooks/useReplayWorkoutDetailsTour";
import { useTrainerWorkout } from "@/hooks/useTrainerWorkout";
import { useCertificationStatus } from "@/hooks/useCertification";
import { TrainerService } from "@/services/trainer/TrainerService";
import { AppPageHeader } from "@/components/app";
import { WorkoutDisplay } from "@/components/workout";
import { WorkoutOnboarding } from "@/components/workout/WorkoutOnboarding";
import {
  CertificationStatusCard,
  CertificationSubmitModal,
  CertificationStatusBadge,
  SubmitForCertificationButton,
} from "@/components/certification";
import type { TrainerWorkout } from "@/types/firestore";
import type { WorkoutTourAnchor } from "@/components/workout/WorkoutDisplay";

export function WorkoutDetailsContent() {
  const searchParams = useSearchParams();
  const workoutId = searchParams.get("id") ?? "";
  const fromParam = searchParams.get("from");
  const showReviewIntro =
    fromParam === "generate" ||
    fromParam === "history" ||
    fromParam === "dashboard" ||
    fromParam === "certification";

  const { user, loading: authLoading } = useUser();
  const {
    completed,
    loading: profileLoading,
    profile,
    updateProfile,
  } = useOnboardingStatus();
  const { busy: replayTourBusy, replay: replayWorkoutDetailsTour } =
    useReplayWorkoutDetailsTour(updateProfile);
  const { workout, loading, error } = useTrainerWorkout(workoutId);
  const { status: certificationStatus } = useCertificationStatus(
    workoutId || null
  );
  const router = useRouter();

  const [certificationModalOpen, setCertificationModalOpen] = useState(false);
  const [workoutDetailsTourRun, setWorkoutDetailsTourRun] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  const handleSaveWorkout = useCallback(
    async (updatedWorkout: TrainerWorkout) => {
      if (!workoutId) return;
      await TrainerService.updateWorkoutSections(
        workoutId,
        updatedWorkout.sections
      );
    },
    [workoutId]
  );

  const dismissReviewIntro = useCallback(() => {
    router.replace(`/workouts?id=${encodeURIComponent(workoutId)}`);
  }, [router, workoutId]);

  const goToPlayerFromIntro = useCallback(() => {
    router.replace(`/workouts/${encodeURIComponent(workoutId)}/player`);
  }, [router, workoutId]);

  const goToWrittenFromIntro = useCallback(() => {
    router.replace(`/workouts/${encodeURIComponent(workoutId)}/written`);
  }, [router, workoutId]);

  const goToWrittenMobileFromIntro = useCallback(() => {
    router.replace(`/workouts/${encodeURIComponent(workoutId)}/written/mobile`);
  }, [router, workoutId]);

  let tourAnchor: WorkoutTourAnchor | null = null;
  const sections = workout?.sections ?? [];
  for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx += 1) {
    if ((sections[sectionIdx]?.exercises?.length ?? 0) > 0) {
      tourAnchor = { sectionIdx, exerciseIdx: 0 };
      break;
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="text-center text-muted-foreground animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!user || !completed) {
    return null;
  }

  if (!workoutId) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="text-center text-muted-foreground">
          No workout ID provided.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-muted/50 rounded-2xl"></div>
          <div className="h-64 bg-muted/30 rounded-xl"></div>
          <div className="h-64 bg-muted/30 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-medium mb-2">
            Failed to load workout
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="container mx-auto py-8 max-w-5xl">
        <div className="text-center text-muted-foreground">
          Workout not found.
        </div>
      </div>
    );
  }

  const canSubmitForCertification =
    certificationStatus === "none" || !certificationStatus;
  const showCertificationCard =
    certificationStatus && certificationStatus !== "none";

  return (
    <TooltipProvider delayDuration={workoutDetailsTourRun ? 800 : 300}>
      <div className="container mx-auto py-8 px-4 pb-48 sm:pb-32">
        <div className="max-w-5xl mx-auto">
          <AppPageHeader backHref="/dashboard" backLabel="Back to Dashboard">
            {certificationStatus === "certified" && (
              <CertificationStatusBadge status="certified" size="md" />
            )}
          </AppPageHeader>
        </div>

        {showCertificationCard && (
          <div className="max-w-5xl mx-auto mb-6">
            <CertificationStatusCard
              workoutId={workoutId}
              workoutTitle={workout.title}
            />
          </div>
        )}

        <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:flex-1 sm:min-w-0">
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto border-orange-400/50 animate-pulse-orange-glow"
            >
              <Link href={`/workouts/${encodeURIComponent(workoutId)}/player`}>
                <Play className="h-4 w-4 mr-2" />
                Workout Player
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto border-sky-500/45 hover:border-sky-400/70 hover:bg-sky-500/10 text-sky-100 animate-pulse-sky-glow"
            >
              <Link href={`/workouts/${encodeURIComponent(workoutId)}/written`}>
                <ScrollText className="h-4 w-4 mr-2" />
                Simple Player
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto border-sky-500/35 hover:border-sky-400/60 hover:bg-sky-500/10 text-sky-100/95"
            >
              <Link
                href={`/workouts/${encodeURIComponent(workoutId)}/written/mobile`}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile Player
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto shrink-0"
              disabled={replayTourBusy}
              onClick={() => void replayWorkoutDetailsTour("workout_details")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {replayTourBusy ? "Resetting tour…" : "Replay guided tour"}
            </Button>
          </div>
          {canSubmitForCertification && (
            <SubmitForCertificationButton
              onOpen={() => setCertificationModalOpen(true)}
            />
          )}
        </div>

        {/* Session completion (sets/exercises + modal) lives in Workout Player only. */}
        <WorkoutOnboarding
          workoutId={workoutId}
          tourAnchor={tourAnchor}
          profile={profile}
          profileLoading={profileLoading}
          updateProfile={updateProfile}
          onRunChange={setWorkoutDetailsTourRun}
          suppressAutoLaunch={showReviewIntro}
        />
        <WorkoutDisplay
          workout={workout}
          onSave={handleSaveWorkout}
          isEditing
          sessionCompletionEnabled={false}
          onRequestImages={() => setCertificationModalOpen(true)}
          tourAnchor={tourAnchor}
        />

        {canSubmitForCertification && (
          <div className="max-w-5xl mx-auto mt-6">
            <SubmitForCertificationButton
              onOpen={() => setCertificationModalOpen(true)}
            />
          </div>
        )}

        <Dialog
          open={showReviewIntro}
          onOpenChange={(open) => {
            if (!open) dismissReviewIntro();
          }}
        >
          <DialogContent className="gap-6 p-6 sm:p-8 max-w-[min(100vw-1.5rem,64rem)] sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Review and Edit mode</DialogTitle>
              <DialogDescription className="text-left space-y-3 sm:pt-1 text-sm sm:text-base">
                <span className="block">
                  You&apos;re on the workout details page to review and edit
                  your plan before you train.
                </span>
                <span className="block">
                  <span className="font-medium text-foreground">
                    Simple Player
                  </span>{" "}
                  is a one-page written sheet of every exercise and set.{" "}
                  <span className="font-medium text-foreground">
                    Mobile Player
                  </span>{" "}
                  is the same logging flow optimized for phones (weights, reps,
                  sets, and done markers—without editing the plan). Both are at
                  the top of this page.
                </span>
                <span className="block">
                  To <span className="font-medium text-foreground">run</span>{" "}
                  the workout and{" "}
                  <span className="font-medium text-foreground">
                    save your session results
                  </span>
                  , use{" "}
                  <span className="font-medium text-foreground">
                    Workout Player
                  </span>{" "}
                  at the top of this page.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:justify-stretch sm:space-x-0">
              <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-10 w-full min-w-0 gap-1.5 whitespace-normal border-sky-500/45 px-2 py-2.5 text-center text-xs leading-snug hover:border-sky-400/70 hover:bg-sky-500/10 text-sky-100 animate-pulse-sky-glow sm:text-sm sm:leading-snug"
                  onClick={goToWrittenFromIntro}
                >
                  <ScrollText className="h-4 w-4 shrink-0" />
                  <span className="text-balance">Open Simple Player</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-10 w-full min-w-0 gap-1.5 whitespace-normal border-sky-500/35 px-2 py-2.5 text-center text-xs leading-snug hover:border-sky-400/60 hover:bg-sky-500/10 text-sky-100/95 sm:text-sm sm:leading-snug"
                  onClick={goToWrittenMobileFromIntro}
                >
                  <Smartphone className="h-4 w-4 shrink-0" />
                  <span className="text-balance">Open Mobile Player</span>
                </Button>
                <Button
                  type="button"
                  className="h-auto min-h-10 w-full min-w-0 gap-1.5 whitespace-normal px-2 py-2.5 text-center text-xs leading-snug sm:text-sm sm:leading-snug"
                  onClick={goToPlayerFromIntro}
                >
                  <Play className="h-4 w-4 shrink-0" />
                  <span className="text-balance">Open Workout Player</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-10 w-full min-w-0 whitespace-normal px-2 py-2.5 text-center text-xs leading-snug sm:text-sm sm:leading-snug"
                  onClick={dismissReviewIntro}
                >
                  Got it
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CertificationSubmitModal
          workoutId={workoutId}
          workoutTitle={workout.title}
          open={certificationModalOpen}
          onOpenChange={setCertificationModalOpen}
        />

        <div className="hidden sm:flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t max-w-5xl mx-auto">
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/generate">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Different Settings
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
          <Button asChild>
            <Link href="/generate">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Another Workout
            </Link>
          </Button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 sm:hidden z-50">
          <div className="flex gap-3 max-w-5xl mx-auto">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/generate">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link href="/generate">
                <Sparkles className="h-4 w-4 mr-2" />
                New Workout
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
