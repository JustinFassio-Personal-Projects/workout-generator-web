"use client";

import { useState } from "react";
import { Info, MoreVertical } from "lucide-react";
import type { TrainerWorkoutExercise } from "@/types/firestore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { WrittenSetLogTable } from "./WrittenSetLogTable";
import { getPreviousSetLabelsForExercise } from "@/lib/workout/writtenPreviousSession";
import type { WorkoutSummary } from "@/types/workoutSummary";
import { ensureSetDetailsForExercise } from "@/components/workout/ExerciseSetLogTable";

export interface WrittenExerciseCardProps {
  exercise: TrainerWorkoutExercise;
  sectionIdx: number;
  exerciseIdx: number;
  flatExerciseIndex: number;
  muscleLabel: string;
  isFocusedExercise: boolean;
  lastSummary: WorkoutSummary | null;
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
}

export function WrittenExerciseCard({
  exercise,
  sectionIdx,
  exerciseIdx,
  flatExerciseIndex,
  muscleLabel,
  isFocusedExercise,
  lastSummary,
  onUpdateSet,
  onToggleSetComplete,
  onExerciseComplete,
  onAddSet,
}: WrittenExerciseCardProps) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const sets = ensureSetDetailsForExercise(exercise);
  const previousSetLabels = getPreviousSetLabelsForExercise(
    lastSummary,
    exercise.name,
    sets.length
  );

  const hasInstructions =
    Boolean(exercise.detailedInstructions?.trim()) ||
    (exercise.cues?.length ?? 0) > 0;

  return (
    <>
      <div
        id={`written-exercise-${flatExerciseIndex}`}
        className={cn(
          "rounded-2xl border bg-card overflow-hidden scroll-mt-28",
          isFocusedExercise
            ? "border-sky-500/45 animate-pulse-sky-glow"
            : "border-border shadow-sm"
        )}
      >
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                <h3 className="text-base font-bold text-sky-400">
                  {exercise.name}
                </h3>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {muscleLabel}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-9 w-9 border-sky-500/45 hover:border-sky-400/70"
                  aria-label="Exercise actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setInstructionsOpen(true)}>
                  <Info className="h-4 w-4 mr-2" />
                  Instructions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-2 sm:p-3">
          <WrittenSetLogTable
            exercise={exercise}
            sectionIdx={sectionIdx}
            exerciseIdx={exerciseIdx}
            previousSetLabels={previousSetLabels}
            onUpdateSet={onUpdateSet}
            onToggleSetComplete={onToggleSetComplete}
            onExerciseComplete={onExerciseComplete}
            onAddSet={onAddSet}
          />
        </div>
      </div>

      <Sheet open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-left pr-8">{exercise.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 text-sm">
            {exercise.detailedInstructions?.trim() ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Instructions
                </p>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {exercise.detailedInstructions.trim()}
                </p>
              </div>
            ) : null}
            {exercise.cues?.length ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Cues
                </p>
                <ul className="space-y-2">
                  {exercise.cues.map((cue, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-muted-foreground leading-snug"
                    >
                      <span className="text-sky-400 shrink-0">•</span>
                      <span>{cue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!hasInstructions ? (
              <p className="text-muted-foreground">
                No detailed instructions for this exercise.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
