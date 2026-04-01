"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  joinRepsDisplay,
  parseRepsDisplay,
} from "@/lib/workout/parseRepsDisplay";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import {
  ExerciseCompleteFooter,
  ensureSetDetailsForExercise,
} from "@/components/workout/ExerciseSetLogTable";

const ROW_GRID =
  "grid grid-cols-[22px_minmax(3.5rem,1fr)_minmax(3.25rem,0.85fr)_minmax(2.5rem,0.55fr)_minmax(4.25rem,0.65fr)] gap-1.5 sm:gap-2";

export interface WrittenSetLogTableProps {
  exercise: TrainerWorkoutExercise;
  sectionIdx: number;
  exerciseIdx: number;
  /** One string per set row from last session summary */
  previousSetLabels: string[];
  onUpdateSet: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    field: string,
    value: string
  ) => void;
  onToggleSetComplete: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  onExerciseComplete: (sIdx: number, eIdx: number, completed: boolean) => void;
  onAddSet: (sIdx: number, eIdx: number) => void;
  showSessionCompletionState?: boolean;
}

export function WrittenSetLogTable({
  exercise,
  sectionIdx,
  exerciseIdx,
  previousSetLabels,
  onUpdateSet,
  onToggleSetComplete,
  onExerciseComplete,
  onAddSet,
  showSessionCompletionState = true,
}: WrittenSetLogTableProps) {
  const isExerciseCompleted =
    showSessionCompletionState && exercise.completed === true;
  const setDetails = ensureSetDetailsForExercise(exercise);

  const sp = (e: React.MouseEvent | React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-1">
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[min(100%,28rem)]">
          <div
            className={cn(
              ROW_GRID,
              "text-[10px] uppercase text-muted-foreground font-bold mb-1 px-0.5"
            )}
          >
            <span className="text-left">Set</span>
            <span className="text-center flex items-center justify-center gap-0.5">
              <History className="h-3 w-3 opacity-60 shrink-0" aria-hidden />
              Previous
            </span>
            <span className="text-center text-primary">Weight (lb)</span>
            <span className="text-center">Reps</span>
            <span className="text-right pr-0.5">Done</span>
          </div>
          {setDetails.map((set, idx) => {
            const isSetCompleted =
              showSessionCompletionState && set.completed === true;
            const shouldStrikethrough = isExerciseCompleted && !isSetCompleted;
            const repsParts = parseRepsDisplay(set.reps || "");
            const prevLabel = previousSetLabels[idx] ?? "—";

            return (
              <div
                key={idx}
                className={cn(
                  ROW_GRID,
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
                <span
                  className={cn(
                    "text-[10px] sm:text-xs text-muted-foreground text-center tabular-nums truncate px-0.5",
                    shouldStrikethrough && "line-through opacity-60"
                  )}
                  title={prevLabel}
                >
                  {prevLabel}
                </span>
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
                  aria-label={`Set ${idx + 1} weight`}
                />
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
                  aria-label={`Set ${idx + 1} reps`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    sp(e);
                    onToggleSetComplete(
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
                      "h-6 w-6 rounded-md border flex items-center justify-center text-xs shrink-0 shadow-sm",
                      isSetCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.45)]"
                        : "border-border bg-muted/50"
                    )}
                  >
                    {isSetCompleted ? "✓" : ""}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-border text-muted-foreground hover:text-foreground"
        onClick={() => onAddSet(sectionIdx, exerciseIdx)}
      >
        + Add set
      </Button>

      <ExerciseCompleteFooter
        exercise={exercise}
        sectionIdx={sectionIdx}
        exerciseIdx={exerciseIdx}
        onExerciseComplete={onExerciseComplete}
        borderClassName="border-border"
      />
    </div>
  );
}
