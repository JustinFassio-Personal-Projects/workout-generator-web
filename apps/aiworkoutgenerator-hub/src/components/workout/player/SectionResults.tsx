"use client";

import { CheckCircle2, Circle, Timer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrainerWorkoutSection } from "@/types/firestore";

interface SectionResultsProps {
  completedSection: TrainerWorkoutSection;
  nextSection?: TrainerWorkoutSection;
  nextSectionIndex?: number;
  onContinue: () => void;
  onFinishWorkout?: (() => void) | undefined;
  className?: string;
}

/**
 * Results page displayed after completing a section's timer.
 * Shows all exercises and sets with their completion status.
 */
export function SectionResults({
  completedSection,
  nextSection,
  nextSectionIndex: _nextSectionIndex,
  onContinue,
  onFinishWorkout,
  className = "",
}: SectionResultsProps) {
  const hasNextSection = !!nextSection;
  const isLastSection = !hasNextSection;

  // Calculate completion statistics
  const totalExercises = completedSection.exercises?.length || 0;
  const completedExercises =
    completedSection.exercises?.filter((ex) => ex.completed === true).length ||
    0;

  let totalSets = 0;
  let completedSets = 0;

  completedSection.exercises?.forEach((exercise) => {
    const exerciseSets = exercise.setDetails?.length || exercise.sets || 0;
    totalSets += exerciseSets;
    exercise.setDetails?.forEach((set) => {
      if (set.completed === true) {
        completedSets++;
      }
    });
  });

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border-2",
        "bg-card border-primary/50 max-w-4xl mx-auto",
        className
      )}
    >
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-12 h-12 text-primary" />
      </div>

      {/* Completed Section Title */}
      <h2 className="text-2xl font-bold text-center mb-2">
        {completedSection.type} Complete!
      </h2>
      <p className="text-muted-foreground text-center mb-6">
        Great work! Here&apos;s your completion summary.
      </p>

      {/* Completion Statistics */}
      <div className="w-full max-w-md bg-muted rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">
              {completedExercises}/{totalExercises}
            </div>
            <div className="text-sm text-muted-foreground">Exercises</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              {completedSets}/{totalSets}
            </div>
            <div className="text-sm text-muted-foreground">Sets</div>
          </div>
        </div>
      </div>

      {/* Exercises and Sets List */}
      <div className="w-full max-w-2xl space-y-4 mb-6">
        {completedSection.exercises?.map((exercise, exerciseIdx) => {
          const exerciseSets =
            exercise.setDetails?.length || exercise.sets || 0;
          const exerciseCompleted = exercise.completed === true;
          const completedSetsInExercise =
            exercise.setDetails?.filter((set) => set.completed === true)
              .length || 0;

          return (
            <div
              key={`${exercise.name}-${exerciseIdx}`}
              className="bg-muted/50 rounded-lg p-4 border border-border"
            >
              {/* Exercise Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {exerciseCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold text-lg">{exercise.name}</h3>
                </div>
                <span className="text-sm text-muted-foreground">
                  {completedSetsInExercise}/{exerciseSets} sets
                </span>
              </div>

              {/* Sets List */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: exerciseSets }).map((_, setIdx) => {
                  const setDetail = exercise.setDetails?.[setIdx];
                  const isSetCompleted = setDetail?.completed === true;

                  return (
                    <div
                      key={setIdx}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold",
                        isSetCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-background border-border text-muted-foreground"
                      )}
                      aria-label={
                        isSetCompleted
                          ? `Set ${setIdx + 1} completed`
                          : `Set ${setIdx + 1} not completed`
                      }
                    >
                      {isSetCompleted ? "✓" : setIdx + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

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
          <Button
            size="lg"
            onClick={onContinue}
            className="w-full h-14 text-lg font-semibold rounded-full"
          >
            <Timer className="w-5 h-5 mr-2" />
            Continue to {nextSection.type}
          </Button>
        ) : (
          <>
            {onFinishWorkout && (
              <Button
                size="lg"
                onClick={onFinishWorkout}
                className="w-full h-14 text-lg font-semibold rounded-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Complete Workout
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={onContinue}
              className="w-full h-12 rounded-full"
            >
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
