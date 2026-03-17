"use client";

import { useEffect } from "react";
import { Timer, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExerciseTimerConfig } from "@/types/ai-exercise-editor";
import type { TrainerWorkoutSection } from "@/types/firestore";

interface RoundCooldownDisplayProps {
  // Round-specific props (optional for section cooldowns)
  currentRound?: number;
  totalRounds?: number;
  completedRounds?: number[];
  nextRoundExercises?: ExerciseTimerConfig[];
  // Timer props (required)
  timeRemaining: number;
  isPaused?: boolean;
  safetyMode?: boolean;
  onComplete?: () => void;
  className?: string;
  // Section summary props (for final section cooldown)
  completedSection?: TrainerWorkoutSection;
  showSummary?: boolean;
  // Action callbacks (for after timer completes)
  onFinishWorkout?: () => void;
  onReturnToOverview?: () => void;
}

/**
 * Round cooldown display showing round completion progress and countdown timer.
 * Displays cumulative rounds report and exercises for next round.
 */
export function RoundCooldownDisplay({
  currentRound,
  totalRounds,
  completedRounds = [],
  nextRoundExercises = [],
  timeRemaining,
  isPaused: _isPaused = false,
  safetyMode = false,
  onComplete,
  className = "",
  completedSection,
  showSummary = false,
  onFinishWorkout,
  onReturnToOverview,
}: RoundCooldownDisplayProps) {
  // Monitor timeRemaining for completion
  // Only trigger onComplete for round cooldowns, not section cooldowns with summary
  useEffect(() => {
    if (timeRemaining <= 0 && !showSummary) {
      onComplete?.();
    }
  }, [timeRemaining, onComplete, showSummary]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const timerComplete = timeRemaining <= 0;

  // Determine if this is a round cooldown or section cooldown
  const isRoundCooldown =
    currentRound !== undefined && totalRounds !== undefined;

  // Calculate completion statistics for section summary
  const totalExercises = completedSection?.exercises?.length || 0;
  const completedExercises =
    completedSection?.exercises?.filter((ex) => ex.completed === true).length ||
    0;

  let totalSets = 0;
  let completedSetsCount = 0;

  completedSection?.exercises?.forEach((exercise) => {
    const exerciseSets = exercise.setDetails?.length || exercise.sets || 0;
    totalSets += exerciseSets;
    exercise.setDetails?.forEach((set) => {
      if (set.completed === true) {
        completedSetsCount++;
      }
    });
  });

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-xl border-2",
        safetyMode
          ? "bg-muted border-primary animate-breathe"
          : "bg-card border-primary/50",
        className
      )}
    >
      {/* Completion Message */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        {isRoundCooldown ? (
          <>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Round {currentRound! - 1} of {totalRounds} Completed!
            </h2>
            <p className="text-sm text-muted-foreground">
              Great work! Take a moment to recover before the next round.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Section Complete!
            </h2>
            <p className="text-sm text-muted-foreground">
              Great work! Take a moment to recover before continuing.
            </p>
          </>
        )}
      </div>

      {/* Cumulative Rounds Report - Only for round cooldowns */}
      {isRoundCooldown && completedRounds.length > 0 && (
        <div className="w-full max-w-md bg-muted rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-muted-foreground mb-2 text-center">
            Rounds Completed
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {completedRounds.map((round) => (
              <span
                key={round}
                className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold"
              >
                Round {round}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Countdown Timer - Hide when timer complete and showing summary */}
      {(!timerComplete || !showSummary) && (
        <div className="mb-6">
          <Timer className="w-8 h-8 mb-4 text-muted-foreground mx-auto" />
          <div
            className={cn(
              "text-6xl font-bold mb-2",
              safetyMode ? "text-safety-text" : "text-foreground"
            )}
          >
            {displayTime}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {isRoundCooldown
              ? `Rest before Round ${currentRound}`
              : "Rest before continuing"}
          </p>
        </div>
      )}

      {/* Next Round Exercises - Only for round cooldowns */}
      {isRoundCooldown && nextRoundExercises.length > 0 && (
        <div className="w-full max-w-md bg-muted rounded-lg p-4">
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            Round {currentRound} Exercises
          </p>
          <div className="space-y-2">
            {nextRoundExercises.map((exercise, idx) => (
              <div
                key={`${exercise.exerciseIndex}-${idx}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">{exercise.exerciseName}</span>
                <span className="text-muted-foreground">
                  Set {currentRound}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Summary - Only for section cooldowns with summary enabled */}
      {showSummary && completedSection && (
        <>
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
                  {completedSetsCount}/{totalSets}
                </div>
                <div className="text-sm text-muted-foreground">Sets</div>
              </div>
            </div>
          </div>

          {/* Exercises and Sets List */}
          <div className="w-full max-w-2xl space-y-4 mb-6 max-h-64 overflow-y-auto">
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

          {/* Action Buttons - Show after timer completes */}
          {timerComplete && (
            <div className="flex flex-col gap-3 w-full max-w-sm">
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
              {onReturnToOverview && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onReturnToOverview}
                  className="w-full h-12 rounded-full"
                >
                  Return to Overview
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
