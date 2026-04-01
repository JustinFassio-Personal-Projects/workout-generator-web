"use client";

import { useLayoutEffect, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Printer,
  ScrollText,
} from "lucide-react";

import type { TrainerWorkout, TrainerWorkoutSection } from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { CompletionModal } from "@/components/history/CompletionModal";
import { useWrittenWorkoutSession } from "@/hooks/useWrittenWorkoutSession";
import { useWrittenWorkoutFirestoreState } from "@/hooks/useWrittenWorkoutFirestoreState";
import { maxFlattenedExerciseIndex } from "@/lib/workout/writtenSession";
import {
  countExercisesCompleted,
  getExerciseCompletionPercentRounded,
} from "@/lib/workout/exerciseCompletionPercent";
import { cn } from "@/lib/utils";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import type { WorkoutSummary } from "@/types/workoutSummary";
import { WrittenWorkoutSessionBar } from "./WrittenWorkoutSessionBar";
import { WrittenExerciseCard } from "./WrittenExerciseCard";
import { WrittenTimerFab } from "./WrittenTimerFab";

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

interface WrittenWorkoutViewProps {
  workout: TrainerWorkout;
  userId: string;
}

/**
 * Single-page workout sheet with logging, previous session column, timer/splits, and completion modal.
 */
export function WrittenWorkoutView({
  workout,
  userId,
}: WrittenWorkoutViewProps) {
  const router = useRouter();
  const [completionOpen, setCompletionOpen] = useState(false);
  const [lastSummary, setLastSummary] = useState<WorkoutSummary | null>(null);
  const [sessionTimerVisible, setSessionTimerVisible] = useState(true);

  const {
    workoutState,
    handleUpdateSetString,
    handleSetComplete,
    handleExerciseComplete,
    handleAddSet,
  } = useWrittenWorkoutFirestoreState(workout);

  const {
    state: sessionState,
    totalSeconds,
    segmentSeconds,
    startWorkout,
    lap,
    endSession,
    resetSession,
  } = useWrittenWorkoutSession(workoutState.id, userId);

  const backHref = `/workouts?id=${encodeURIComponent(workoutState.id)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await WorkoutSummaryService.getLatestSummaryForWorkout(
          workoutState.id,
          userId
        );
        if (!cancelled) setLastSummary(s);
      } catch {
        if (!cancelled) setLastSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workoutState.id, userId]);

  const metaLine = useMemo(() => {
    const mins =
      workoutState.duration_minutes ?? workoutState.totalDuration ?? 0;
    const diff = workoutState.difficulty
      ? workoutState.difficulty.charAt(0).toUpperCase() +
        workoutState.difficulty.slice(1)
      : null;
    const bits: string[] = [];
    if (mins) bits.push(`${mins} min`);
    if (diff) bits.push(diff);
    if (workoutState.focus?.trim()) bits.push(workoutState.focus.trim());
    return bits;
  }, [workoutState]);

  const sessionProgress = useMemo(() => {
    const pct = getExerciseCompletionPercentRounded(workoutState);
    const { completed, total } = countExercisesCompleted(workoutState);
    return { pct, completed, total };
  }, [workoutState]);

  const sections: TrainerWorkoutSection[] = workoutState.sections ?? [];
  const maxExerciseFlatIndex = maxFlattenedExerciseIndex(sections);

  useLayoutEffect(() => {
    if (sessionState.status !== "active_work") return;
    if (sections.length === 0) return;
    const el = document.getElementById(
      `written-exercise-${sessionState.focusedExerciseFlatIndex}`
    );
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });
  }, [
    sessionState.focusedExerciseFlatIndex,
    sessionState.status,
    sections.length,
  ]);

  let exerciseFlatCounter = 0;

  return (
    <div
      className={cn(
        "written-workout-print-root min-h-screen bg-background text-foreground",
        sessionTimerVisible ? "pb-40" : "pb-24"
      )}
    >
      <header className="written-workout-no-print sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 -ml-2"
              onClick={() => router.push(backHref)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <ScrollText className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/90">
                  Written workout
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate print:text-2xl">
                {workoutState.title || "Workout"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                {sessionProgress.total > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <span className="tabular-nums">
                      Session · {sessionProgress.pct}%
                    </span>
                    <span className="text-muted-foreground font-normal">
                      ({sessionProgress.completed}/{sessionProgress.total}{" "}
                      exercises)
                    </span>
                  </span>
                ) : null}
                {metaLine.map((b, i) => (
                  <span
                    key={`${b}-${i}`}
                    className="inline-flex items-center gap-1"
                  >
                    <Clock className="h-3 w-3 opacity-70" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              type="button"
              className="shrink-0 bg-sky-600 text-white hover:bg-sky-500 shadow-md shadow-sky-900/25"
              onClick={() => setCompletionOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finish workout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {sections.length > 0 ? (
          <nav
            aria-label="Jump to section"
            className="written-workout-no-print sticky top-[calc(env(safe-area-inset-top,0px)+5rem)] z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm border border-border rounded-xl sm:static sm:bg-transparent sm:border-0 sm:p-0"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Jump to
            </p>
            <div className="flex flex-wrap gap-2">
              {sections.map((section, sectionIdx) => (
                <a
                  key={`toc-${sectionIdx}`}
                  href={`#written-section-${sectionIdx}`}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/30 hover:bg-muted/60 text-foreground transition-colors"
                >
                  {section.type}
                </a>
              ))}
            </div>
          </nav>
        ) : null}

        {workoutState.description?.trim() ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {workoutState.description}
          </p>
        ) : null}

        {sections.map((section, sectionIdx) => (
          <section
            key={`${section.type}-${sectionIdx}`}
            id={`written-section-${sectionIdx}`}
            className="scroll-mt-24 space-y-4"
          >
            <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                {section.type}
              </h2>
              {section.durationEstimate?.trim() ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {section.durationEstimate}
                </span>
              ) : null}
            </div>

            {(section.exercises ?? []).map((exercise, exerciseIdx) => {
              const flatExerciseIndex = exerciseFlatCounter++;
              const muscle =
                exercise.muscleTarget ||
                exercise.muscle_groups?.join(" · ") ||
                "—";

              const isFocusedExercise =
                sessionState.status !== "idle" &&
                flatExerciseIndex === sessionState.focusedExerciseFlatIndex;

              return (
                <WrittenExerciseCard
                  key={`${sectionIdx}-${exerciseIdx}-${exercise.name}`}
                  exercise={exercise}
                  sectionIdx={sectionIdx}
                  exerciseIdx={exerciseIdx}
                  flatExerciseIndex={flatExerciseIndex}
                  muscleLabel={muscle}
                  isFocusedExercise={isFocusedExercise}
                  lastSummary={lastSummary}
                  onUpdateSet={handleUpdateSetString}
                  onToggleSetComplete={handleSetComplete}
                  onExerciseComplete={handleExerciseComplete}
                  onAddSet={handleAddSet}
                />
              );
            })}
          </section>
        ))}

        {sections.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            No exercises in this workout.
          </p>
        ) : null}

        <div
          className={cn(
            "rounded-xl border border-dashed border-border bg-muted/10 p-4 text-center text-xs text-muted-foreground",
            "written-workout-no-print"
          )}
        >
          Session logging and completion are available in the{" "}
          <button
            type="button"
            className="text-sky-400 font-medium hover:underline"
            onClick={() =>
              router.push(
                `/workouts/${encodeURIComponent(workoutState.id)}/player`
              )
            }
          >
            Workout Player
          </button>
          .
        </div>

        {sessionState.splits.length > 0 ? (
          <section
            aria-label="Session splits"
            className="written-workout-splits rounded-xl border border-border bg-card/50 p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Splits{" "}
              <span className="text-muted-foreground font-normal">
                ({sessionState.splits.length})
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {sessionState.splits.map((sp, i) => (
                <div
                  key={`${sp.recordedAt}-${i}`}
                  className="rounded-lg border border-border bg-muted/30 px-2 py-2.5 text-center min-h-[4.25rem] flex flex-col items-center justify-center gap-1"
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      sp.kind === "work"
                        ? "text-sky-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {sp.kind === "work" ? "Work" : "Rest"}
                  </span>
                  <span className="text-base font-mono font-semibold tabular-nums text-foreground leading-none">
                    {formatClock(sp.seconds)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      {sessionTimerVisible ? (
        <WrittenWorkoutSessionBar
          className="written-workout-no-print"
          status={sessionState.status}
          totalSeconds={totalSeconds}
          segmentSeconds={segmentSeconds}
          onStartWorkout={startWorkout}
          onLap={() => lap(maxExerciseFlatIndex)}
          onEndSession={endSession}
          onReset={resetSession}
          onHide={() => setSessionTimerVisible(false)}
        />
      ) : (
        <WrittenTimerFab
          className="written-workout-no-print"
          onShow={() => setSessionTimerVisible(true)}
        />
      )}

      <CompletionModal
        workout={completionOpen ? workoutState : null}
        open={completionOpen}
        onOpenChange={setCompletionOpen}
      />
    </div>
  );
}
