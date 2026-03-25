"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  joinRepsDisplay,
  parseRepsDisplay,
} from "@/lib/workout/parseRepsDisplay";
import type {
  TrainerWorkoutExercise,
  TrainerSetDetail,
} from "@/types/firestore";

const DEFAULT_SET: TrainerSetDetail = {
  reps: "",
  weight: "",
  rest: "60s",
};

/** Pad setDetails to exercise.sets length (shared by player + editor). */
export function ensureSetDetailsForExercise(
  exercise: TrainerWorkoutExercise
): TrainerSetDetail[] {
  const target = exercise.sets || 1;
  const current = exercise.setDetails || [];
  if (current.length >= target) {
    return current;
  }
  const padded = [...current];
  const lastSet = current[current.length - 1] || DEFAULT_SET;
  while (padded.length < target) {
    padded.push({ ...lastSet, reps: "", weight: "" });
  }
  return padded;
}

export interface ExerciseSetLogTableProps {
  exercise: TrainerWorkoutExercise;
  sectionIdx: number;
  exerciseIdx: number;
  onUpdateSet: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    field: string,
    value: string
  ) => void;
  onToggleSetComplete?: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  /** When false, hide logged weight, rest, and set-done (safety mode). */
  showLoggingColumns?: boolean;
  /** Call stopPropagation on field interactions (editor cards with onClick). */
  stopPropagationOnInteract?: boolean;
  className?: string;
  /** min-width grid for horizontal scroll on narrow viewports */
  gridMinWidth?: string;
}

const HEADER_GRID =
  "grid grid-cols-[22px_minmax(2.5rem,0.55fr)_minmax(4rem,1fr)_minmax(3rem,0.75fr)_minmax(3.5rem,0.75fr)_minmax(2.25rem,0.5fr)_minmax(4.5rem,0.7fr)] gap-1.5 sm:gap-2";

/**
 * Shared set log: #, Reps (count + note via parseRepsDisplay), Intensity (prescription weight),
 * actual weight, rest, set done — same fields in workout editor and player.
 */
export function ExerciseSetLogTable({
  exercise,
  sectionIdx,
  exerciseIdx,
  onUpdateSet,
  onToggleSetComplete,
  showLoggingColumns = true,
  stopPropagationOnInteract = false,
  className,
  gridMinWidth = "min-w-[36rem]",
}: ExerciseSetLogTableProps) {
  const isExerciseCompleted = exercise.completed === true;
  const setDetails = ensureSetDetailsForExercise(exercise);

  const sp = (e: React.MouseEvent | React.SyntheticEvent) => {
    if (stopPropagationOnInteract) e.stopPropagation();
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className={cn(gridMinWidth)}>
          <div
            className={cn(
              HEADER_GRID,
              "text-[10px] uppercase text-muted-foreground font-bold mb-1 px-0.5"
            )}
          >
            <span className="text-left">#</span>
            <span className="text-center">Reps</span>
            <span className="text-center">Note</span>
            <span className="text-center">Intensity</span>
            {showLoggingColumns ? (
              <>
                <span className="text-center text-primary">Weight</span>
                <span className="text-right">Rest</span>
                <span className="text-right">Done</span>
              </>
            ) : (
              <>
                <span />
                <span />
                <span />
              </>
            )}
          </div>
          {setDetails.map((set, idx) => {
            const isSetCompleted = set.completed === true;
            const shouldStrikethrough = isExerciseCompleted && !isSetCompleted;
            const repsParts = parseRepsDisplay(set.reps || "");

            return (
              <div
                key={idx}
                className={cn(
                  HEADER_GRID,
                  "items-center bg-muted p-1.5 sm:p-2 rounded text-sm border border-border gap-1.5 sm:gap-2",
                  isSetCompleted && "border-emerald-500/60 bg-emerald-500/5"
                )}
              >
                <span
                  className={cn(
                    "text-muted-foreground font-mono text-xs text-center",
                    shouldStrikethrough && "line-through opacity-60"
                  )}
                >
                  {idx + 1}
                </span>
                <Input
                  type="text"
                  value={repsParts.count}
                  onClick={sp}
                  onChange={(e) => {
                    onUpdateSet(
                      sectionIdx,
                      exerciseIdx,
                      idx,
                      "reps",
                      joinRepsDisplay({
                        count: e.target.value,
                        note: repsParts.note,
                      })
                    );
                  }}
                  placeholder="—"
                  className={cn(
                    "h-7 sm:h-8 text-center text-xs tabular-nums px-1 min-w-0",
                    shouldStrikethrough && "opacity-60"
                  )}
                  aria-label={`Set ${idx + 1} rep count`}
                />
                <Input
                  type="text"
                  value={repsParts.note}
                  onClick={sp}
                  onChange={(e) => {
                    onUpdateSet(
                      sectionIdx,
                      exerciseIdx,
                      idx,
                      "reps",
                      joinRepsDisplay({
                        count: repsParts.count,
                        note: e.target.value,
                      })
                    );
                  }}
                  placeholder="e.g. each side"
                  className={cn(
                    "h-7 sm:h-8 text-xs px-1 min-w-0",
                    shouldStrikethrough && "opacity-60"
                  )}
                  aria-label={`Set ${idx + 1} rep note or direction`}
                />
                <span
                  className={cn(
                    "text-foreground font-medium text-center text-[10px] truncate px-0.5",
                    shouldStrikethrough && "line-through opacity-60"
                  )}
                  title={set.weight}
                >
                  {set.weight || "—"}
                </span>
                {showLoggingColumns ? (
                  <>
                    <Input
                      type="text"
                      placeholder="lbs"
                      value={set.actualWeight || ""}
                      onClick={sp}
                      onChange={(e) =>
                        onUpdateSet(
                          sectionIdx,
                          exerciseIdx,
                          idx,
                          "actualWeight",
                          e.target.value
                        )
                      }
                      className={cn(
                        "h-7 sm:h-8 bg-background border-border text-center text-primary text-xs py-1 px-1 min-w-0 focus:border-primary",
                        shouldStrikethrough && "opacity-60"
                      )}
                    />
                    <span
                      className={cn(
                        "text-foreground font-medium text-right text-xs truncate",
                        shouldStrikethrough && "line-through opacity-60"
                      )}
                    >
                      {set.duration || set.rest || "—"}
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault();
                        sp(e);
                        onToggleSetComplete?.(
                          sectionIdx,
                          exerciseIdx,
                          idx,
                          !isSetCompleted
                        );
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                      className={cn(
                        "inline-flex items-center justify-end gap-1 text-[10px] font-semibold min-w-0",
                        isSetCompleted
                          ? "text-emerald-500"
                          : "text-muted-foreground hover:text-emerald-500"
                      )}
                      aria-label={
                        isSetCompleted
                          ? `Mark set ${idx + 1} as incomplete`
                          : `Mark set ${idx + 1} as complete`
                      }
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center text-[9px] shrink-0",
                          isSetCompleted
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-border"
                        )}
                      >
                        {isSetCompleted ? "✓" : ""}
                      </span>
                      <span className="truncate">
                        {isSetCompleted ? "Done" : "Complete"}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    <span />
                    <span />
                    <span />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export interface ExerciseCompleteFooterProps {
  exercise: TrainerWorkoutExercise;
  sectionIdx: number;
  exerciseIdx: number;
  onExerciseComplete?: (
    sectionIdx: number,
    exerciseIdx: number,
    completed: boolean
  ) => void;
  stopPropagationOnInteract?: boolean;
  borderClassName?: string;
}

export function ExerciseCompleteFooter({
  exercise,
  sectionIdx,
  exerciseIdx,
  onExerciseComplete,
  stopPropagationOnInteract = false,
  borderClassName = "border-border/50",
}: ExerciseCompleteFooterProps) {
  if (!onExerciseComplete) return null;

  const isCompleted = exercise.completed === true;

  const handleToggle = (e: React.MouseEvent) => {
    if (stopPropagationOnInteract) e.stopPropagation();
    onExerciseComplete(sectionIdx, exerciseIdx, !isCompleted);
  };

  return (
    <div
      className={cn(
        "flex justify-center items-center gap-2 mt-4 pt-4 border-t",
        borderClassName
      )}
    >
      <Button
        variant={isCompleted ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        className={cn(
          "w-full sm:w-auto",
          isCompleted
            ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
            : "border-border hover:bg-background"
        )}
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        <CheckCircle2 className={cn("w-4 h-4", !isCompleted && "mr-2")} />
        {isCompleted ? "Completed" : "Complete Exercise"}
      </Button>
      {isCompleted && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          className="shrink-0 border-border hover:bg-background rounded-full p-2 h-8 w-8"
          aria-label="Restore exercise (mark as incomplete)"
          title="Restore exercise"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
