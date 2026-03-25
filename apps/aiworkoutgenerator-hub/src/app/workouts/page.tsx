"use client";

import { Suspense, useEffect, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RefreshCw, Sparkles, Shield, Play } from "lucide-react";

import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useTrainerWorkout } from "@/hooks/useTrainerWorkout";
import { useCertificationStatus } from "@/hooks/useCertification";
import { TrainerService } from "@/services/trainer/TrainerService";
import { AppPageHeader } from "@/components/app";
import { WorkoutDisplay } from "@/components/workout";
import { CompleteWorkoutFAB } from "@/components/workout/CompleteWorkoutFAB";
import {
  CertificationStatusCard,
  CertificationSubmitModal,
  CertificationStatusBadge,
} from "@/components/certification";
import { CompletionModal } from "@/components/history/CompletionModal";
import type { TrainerWorkout } from "@/types/firestore";

function WorkoutDetailsContent() {
  const searchParams = useSearchParams();
  const workoutId = searchParams.get("id") ?? "";

  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const { workout, loading, error } = useTrainerWorkout(workoutId);
  const { status: certificationStatus } = useCertificationStatus(
    workoutId || null
  );
  const router = useRouter();

  const [certificationModalOpen, setCertificationModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [currentWorkoutState, setCurrentWorkoutState] =
    useState<TrainerWorkout | null>(null);

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

  // Determine if certification actions are available
  const canSubmitForCertification =
    certificationStatus === "none" || !certificationStatus;
  const showCertificationCard =
    certificationStatus && certificationStatus !== "none";

  return (
    <div className="container mx-auto py-8 px-4 pb-48 sm:pb-32">
      {/* Top Navigation */}
      <div className="max-w-5xl mx-auto">
        <AppPageHeader backHref="/dashboard" backLabel="Back to Dashboard">
          {certificationStatus === "certified" && (
            <CertificationStatusBadge status="certified" size="md" />
          )}
        </AppPageHeader>
      </div>

      {/* Certification Status Card (when in process) */}
      {showCertificationCard && (
        <div className="max-w-5xl mx-auto mb-6">
          <CertificationStatusCard
            workoutId={workoutId}
            workoutTitle={workout.title}
          />
        </div>
      )}

      {/* Try New Player Button and Certification Button */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Button
          variant="outline"
          asChild
          className="w-full sm:w-auto border-orange-400/50 animate-pulse-orange-glow"
        >
          <Link href={`/workouts/${workoutId}/player`}>
            <Play className="h-4 w-4 mr-2" />
            Workout Player
          </Link>
        </Button>
        {canSubmitForCertification && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-yellow-400/50 animate-breathe-gold-glow"
                  onClick={() => setCertificationModalOpen(true)}
                >
                  <Shield className="h-4 w-4 mr-2 text-yellow-400" />
                  Submit for Trainer Certification
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-sm p-0 bg-popover border"
              >
                <div className="flex gap-3 p-3">
                  <div className="relative w-12 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src="/images/coach/justin-profile-hero-three-quarter.png"
                      alt="Coach Justin"
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1 text-yellow-400">
                      Submit for Trainer Certification
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Submit your workout for review and certification. Coach
                      Justin will review your workout and make personalized
                      adjustments based on your profile, goals, and responses.
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Note: onRequestImages opens certification modal - images are only available through certification workflow */}
      <WorkoutDisplay
        workout={workout}
        onSave={handleSaveWorkout}
        isEditing
        onWorkoutStateChange={setCurrentWorkoutState}
        onRequestImages={() => setCertificationModalOpen(true)}
      />

      {/* Submit for Certification Button (when not submitted) */}
      {canSubmitForCertification && (
        <div className="max-w-5xl mx-auto mt-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-yellow-400/50 animate-breathe-gold-glow"
                  onClick={() => setCertificationModalOpen(true)}
                >
                  <Shield className="h-4 w-4 mr-2 text-yellow-400" />
                  Submit for Trainer Certification
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-sm p-0 bg-popover border"
              >
                <div className="flex gap-3 p-3">
                  <div className="relative w-12 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src="/images/coach/justin-profile-hero-three-quarter.png"
                      alt="Coach Justin"
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1 text-yellow-400">
                      Submit for Trainer Certification
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Submit your workout for review and certification. Coach
                      Justin will review your workout and make personalized
                      adjustments based on your profile, goals, and responses.
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Certification Submit Modal */}
      <CertificationSubmitModal
        workoutId={workoutId}
        workoutTitle={workout.title}
        open={certificationModalOpen}
        onOpenChange={setCertificationModalOpen}
      />

      {/* Complete Workout FAB */}
      <CompleteWorkoutFAB
        workout={currentWorkoutState || workout}
        onClick={() => setCompletionModalOpen(true)}
      />

      {/* Completion Modal */}
      <CompletionModal
        workout={currentWorkoutState || workout}
        open={completionModalOpen}
        onOpenChange={setCompletionModalOpen}
      />

      {/* Bottom Action Bar - Desktop */}
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

      {/* Mobile Sticky Bottom Bar */}
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
  );
}

export default function WorkoutDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 max-w-5xl">
          <div className="text-center text-muted-foreground animate-pulse">
            Loading...
          </div>
        </div>
      }
    >
      <WorkoutDetailsContent />
    </Suspense>
  );
}
