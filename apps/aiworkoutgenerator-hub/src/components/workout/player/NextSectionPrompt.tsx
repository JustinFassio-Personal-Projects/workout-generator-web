"use client";

import { CheckCircle2, Timer, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrainerWorkoutSection } from "@/types/firestore";

interface NextSectionPromptProps {
  completedSection: TrainerWorkoutSection;
  nextSection?: TrainerWorkoutSection;
  nextSectionIndex?: number;
  onConfigureNext: () => void;
  onSkipToOverview: () => void;
  onFinishWorkout?: () => void;
  className?: string;
}

/**
 * Prompt displayed after completing a section's timer.
 * Offers options to configure the next section's timer or return to overview.
 */
export function NextSectionPrompt({
  completedSection,
  nextSection,
  nextSectionIndex,
  onConfigureNext,
  onSkipToOverview,
  onFinishWorkout,
  className = "",
}: NextSectionPromptProps) {
  const hasNextSection = !!nextSection;
  const isLastSection = !hasNextSection;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border-2",
        "bg-card border-primary/50",
        className
      )}
    >
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-12 h-12 text-primary" />
      </div>

      {/* Completed Section */}
      <h2 className="text-2xl font-bold text-center mb-2">
        {completedSection.type} Complete!
      </h2>
      <p className="text-muted-foreground text-center mb-6">
        Great work! You&apos;ve finished all exercises in this section.
      </p>

      {/* Next Section Info */}
      {hasNextSection && (
        <div className="w-full max-w-sm bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">
              Next Up
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">{nextSection.type}</h3>
          <p className="text-sm text-muted-foreground">
            {nextSection.exercises?.length || 0} exercises •{" "}
            {nextSection.durationEstimate}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {hasNextSection ? (
          <>
            <Button
              size="lg"
              onClick={onConfigureNext}
              className="w-full h-14 text-lg font-semibold rounded-full"
            >
              <Timer className="w-5 h-5 mr-2" />
              Set Up {nextSection.type} Timer
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onSkipToOverview}
              className="w-full h-12 rounded-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Overview
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              onClick={onFinishWorkout}
              className="w-full h-14 text-lg font-semibold rounded-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Complete Workout
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onSkipToOverview}
              className="w-full h-12 rounded-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Overview
            </Button>
          </>
        )}
      </div>

      {/* Encouragement Text */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        {isLastSection
          ? "You&apos;ve completed all sections. Amazing effort!"
          : "Keep the momentum going!"}
      </p>
    </div>
  );
}
