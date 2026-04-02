"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Timer, PanelTop, Play } from "lucide-react";
import type {
  TrainerWorkout,
  TrainerWorkoutSection,
  TrainerSetDetail,
} from "@/types/firestore";
import { Button } from "@/components/ui/button";
import { WorkoutPlayerShell } from "./WorkoutPlayerShell";
import { ManualExerciseCard } from "./ManualExerciseCard";
import { getPhaseMap, type PhaseType } from "@/lib/workout/phaseMap";
import { TrainerService } from "@/services/trainer/TrainerService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CompletionModal } from "@/components/history/CompletionModal";
import { devLogError } from "@/lib/devLog";
import { useUser } from "@/lib/auth";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import { useWorkoutAnalyticsAttempt } from "@/contexts/WorkoutAnalyticsAttemptContext";
import { exerciseHasCompletedSet } from "@/lib/workout/exerciseCompletion";

const SAFETY_STORAGE_KEY = "workout-player-safety-mode";

function formatSectionElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function finishCurrentBlockLabel(sectionType: string | undefined): string {
  const t = sectionType?.trim();
  if (t) return `Finish ${t}`;
  return "Finish block";
}

type PlayerSurface = "hub" | "block";

const PHASE_ORDER: PhaseType[] = ["warmup", "main", "finisher"];

interface ManualWorkoutPlayerProps {
  workout: TrainerWorkout;
}

/**
 * Manual workout player with horizontal scroll section blocks.
 * User selects Warmup/Main/Cooldown, scrolls through exercises manually,
 * logs sets/reps/weight/completed, with live Firestore persistence.
 */
export function ManualWorkoutPlayer({ workout }: ManualWorkoutPlayerProps) {
  const { user } = useUser();
  const { sessionId } = useSession();
  const analytics = useWorkoutAnalyticsAttempt();
  const loggedWorkoutStartRef = useRef(false);
  const [workoutState, setWorkoutState] = useState<TrainerWorkout>(workout);
  const [safetyMode, setSafetyMode] = useState(false);
  /** Hub = pick a block inside the player; block = active block session (shows block-only CTA). */
  const [playerSurface, setPlayerSurface] = useState<PlayerSurface>("hub");
  const [currentPhase, setCurrentPhase] = useState<PhaseType>("warmup");
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sectionElapsedSeconds, setSectionElapsedSeconds] = useState<
    Record<number, number>
  >({});
  const [runningSectionIndex, setRunningSectionIndex] = useState<number | null>(
    null
  );
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  /** Lets users see header/nav while the timer keeps running (accessibility). */
  const [chromeUnlocked, setChromeUnlocked] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef<TrainerWorkoutSection[]>(workout.sections || []);

  // Sync safety mode from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(SAFETY_STORAGE_KEY);
    if (saved === "true") {
      setSafetyMode(true);
    }
  }, []);

  useEffect(() => {
    sectionsRef.current = workoutState.sections || [];
  }, [workoutState.sections]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [workoutState.id]);

  const phaseMap = getPhaseMap(workoutState.sections);
  const currentSectionData = phaseMap[currentPhase];
  const currentSection = currentSectionData?.section;
  const sectionIndex = currentSectionData?.index ?? 0;
  const exercises = currentSection?.exercises || [];
  const currentExercise = exercises[currentExerciseIndex];

  const isFirstExercise = currentExerciseIndex === 0;
  const isLastExercise =
    exercises.length === 0 || currentExerciseIndex >= exercises.length - 1;

  const focusMode =
    playerSurface === "block" && isTimerRunning && !chromeUnlocked;
  const inBlockSession = playerSurface === "block";

  const enterBlockSession = useCallback((phase: PhaseType) => {
    setIsTimerRunning(false);
    setChromeUnlocked(false);
    setCurrentPhase(phase);
    setCurrentExerciseIndex(0);
    setPlayerSurface("block");
  }, []);

  const exitBlockSessionToHub = useCallback(() => {
    setIsTimerRunning(false);
    setChromeUnlocked(false);
    setPlayerSurface("hub");
  }, []);

  useEffect(() => {
    if (!isTimerRunning || runningSectionIndex === null) return;
    const id = setInterval(() => {
      setSectionElapsedSeconds((prev) => ({
        ...prev,
        [runningSectionIndex]: (prev[runningSectionIndex] ?? 0) + 1,
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning, runningSectionIndex]);

  const logWorkoutStartIfNeeded = useCallback(() => {
    if (
      loggedWorkoutStartRef.current ||
      !user ||
      !analytics ||
      !workoutState.id
    ) {
      return;
    }
    loggedWorkoutStartRef.current = true;
    void logUserActivity(
      user.uid,
      "workout:start",
      "workout",
      workoutState.id,
      {
        surface: analytics.surface,
        workout_attempt_id: analytics.workoutAttemptId,
      },
      {
        sessionId: sessionId || undefined,
        workoutAttemptId: analytics.workoutAttemptId,
      }
    ).catch(() => {
      /* non-blocking */
    });
  }, [user, analytics, workoutState.id, sessionId]);

  const handleSectionTimerToggle = useCallback(() => {
    const idx = sectionIndex;
    if (runningSectionIndex === idx && isTimerRunning) {
      setIsTimerRunning(false);
      setChromeUnlocked(false);
      return;
    }
    if (runningSectionIndex === idx && !isTimerRunning) {
      logWorkoutStartIfNeeded();
      setIsTimerRunning(true);
      setChromeUnlocked(false);
      return;
    }
    logWorkoutStartIfNeeded();
    setRunningSectionIndex(idx);
    setIsTimerRunning(true);
    setChromeUnlocked(false);
  }, [
    sectionIndex,
    runningSectionIndex,
    isTimerRunning,
    logWorkoutStartIfNeeded,
  ]);

  const handleSectionTimerReset = useCallback(() => {
    const idx = sectionIndex;
    setSectionElapsedSeconds((prev) => ({ ...prev, [idx]: 0 }));
    if (runningSectionIndex === idx) {
      setIsTimerRunning(false);
      setChromeUnlocked(false);
    }
  }, [sectionIndex, runningSectionIndex]);

  const handleExerciseNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev" && currentExerciseIndex > 0) {
        setCurrentExerciseIndex(currentExerciseIndex - 1);
      } else if (
        direction === "next" &&
        currentExerciseIndex < exercises.length - 1
      ) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
    },
    [currentExerciseIndex, exercises.length]
  );

  const handleExerciseChipClick = useCallback((idx: number) => {
    setCurrentExerciseIndex(idx);
  }, []);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      const sections = sectionsRef.current;
      if (!workoutState.id || !sections.length) return;
      try {
        await TrainerService.updateWorkoutSections(workoutState.id, sections);
        toast.success("Workout progress saved.", { duration: 2000 });
      } catch (error) {
        devLogError("ManualWorkoutPlayer.save", error);
        toast.error("Could not save workout progress. Please try again.");
      }
    }, 800);
  }, [workoutState.id]);

  const ensureSetDetailsLength = useCallback(
    (
      sections: TrainerWorkoutSection[],
      sIdx: number,
      eIdx: number,
      minLength: number
    ): TrainerWorkoutSection[] => {
      const section = sections[sIdx];
      if (!section?.exercises) return sections;
      const exercise = section.exercises[eIdx];
      if (!exercise) return sections;
      const details = exercise.setDetails || [];
      if (details.length >= minLength) return sections;

      const padded = [...details];
      const lastSet = details[details.length - 1] || {
        reps: "",
        weight: "",
        rest: "60s",
      };
      while (padded.length < minLength) {
        padded.push({ ...lastSet, reps: "", weight: "" });
      }

      const newSections = [...sections];
      newSections[sIdx] = { ...section };
      newSections[sIdx].exercises = [...section.exercises];
      newSections[sIdx].exercises[eIdx] = {
        ...exercise,
        setDetails: padded,
      };
      return newSections;
    },
    []
  );

  const handleSetComplete = useCallback(
    (sIdx: number, eIdx: number, setIdx: number, completed: boolean) => {
      setWorkoutState((prev) => {
        const sections = prev.sections || [];
        const section = sections[sIdx];
        if (!section?.exercises) return prev;
        const exercise = section.exercises[eIdx];
        if (!exercise?.setDetails || setIdx >= exercise.setDetails.length)
          return prev;

        const newSections = structuredClone(sections);
        const targetExercise = newSections[sIdx].exercises[eIdx];
        if (targetExercise.setDetails[setIdx]) {
          targetExercise.setDetails[setIdx].completed = completed;
        }
        if (targetExercise.setDetails?.length) {
          const allDone = targetExercise.setDetails.every(
            (s) => s.completed === true
          );
          targetExercise.completed = allDone;
        }
        return { ...prev, sections: newSections };
      });
      debouncedSave();
    },
    [debouncedSave]
  );

  const handleExerciseComplete = useCallback(
    (sIdx: number, eIdx: number, completed: boolean) => {
      if (completed) {
        const ex = workoutState.sections?.[sIdx]?.exercises?.[eIdx];
        if (!exerciseHasCompletedSet(ex)) {
          toast.error(
            "Please complete at least one set before completing the exercise"
          );
          return;
        }
      }
      setWorkoutState((prev) => {
        const sections = prev.sections || [];
        const newSections = structuredClone(sections);
        const exercise = newSections[sIdx]?.exercises?.[eIdx];
        if (exercise) {
          exercise.completed = completed;
        }
        return { ...prev, sections: newSections };
      });
      debouncedSave();
    },
    [workoutState.sections, debouncedSave]
  );

  const handleSetFieldUpdate = useCallback(
    (
      sIdx: number,
      eIdx: number,
      setIdx: number,
      field: keyof TrainerSetDetail,
      value: string | boolean
    ) => {
      setWorkoutState((prev) => {
        let sections = prev.sections || [];
        sections = ensureSetDetailsLength(sections, sIdx, eIdx, setIdx + 1);
        const section = sections[sIdx];
        const exercise = section?.exercises[eIdx];
        if (!exercise?.setDetails) return prev;

        const newSections = structuredClone(sections);
        const targetExercise = newSections[sIdx].exercises[eIdx];
        const targetSet = targetExercise.setDetails[setIdx];
        if (targetSet) {
          if (field === "completed" && typeof value === "boolean") {
            targetSet.completed = value;
          } else if (
            typeof value === "string" &&
            (field === "reps" ||
              field === "weight" ||
              field === "actualWeight" ||
              field === "rest" ||
              field === "notes")
          ) {
            targetSet[field] = value;
          }
        }
        return { ...prev, sections: newSections };
      });
      debouncedSave();
    },
    [debouncedSave, ensureSetDetailsLength]
  );

  const handleUpdateSetString = useCallback(
    (
      sIdx: number,
      eIdx: number,
      setIdx: number,
      field: string,
      value: string
    ) => {
      if (
        field !== "reps" &&
        field !== "weight" &&
        field !== "actualWeight" &&
        field !== "rest" &&
        field !== "notes"
      ) {
        return;
      }
      handleSetFieldUpdate(
        sIdx,
        eIdx,
        setIdx,
        field as keyof TrainerSetDetail,
        value
      );
    },
    [handleSetFieldUpdate]
  );

  const getExerciseReasoning = useCallback(
    (sIdx: number, eIdx: number): string | undefined => {
      const exercise = workoutState.sections?.[sIdx]?.exercises?.[eIdx];
      if (!exercise) return undefined;
      const personalization = workoutState.personalization || [];
      const relevantItem = personalization.find((item) =>
        item.adjustment.toLowerCase().includes(exercise.name.toLowerCase())
      );
      return relevantItem?.adjustment;
    },
    [workoutState]
  );

  const getExerciseTrustBadges = useCallback(
    (sIdx: number, eIdx: number) => {
      const exercise = workoutState.sections?.[sIdx]?.exercises?.[eIdx];
      if (!exercise) return [];
      const personalization = workoutState.personalization || [];
      const hasInjuryModification = personalization.some(
        (item) =>
          item.attribute.toLowerCase().includes("injury") &&
          item.adjustment.toLowerCase().includes(exercise.name.toLowerCase())
      );
      if (hasInjuryModification) {
        return [
          {
            type: "safety-modified" as const,
            explanation: "Modified for your injury profile.",
          },
        ];
      }
      return [];
    },
    [workoutState]
  );

  // Keep local state in sync with prop
  useEffect(() => {
    setWorkoutState(workout);
  }, [workout]);

  useEffect(() => {
    loggedWorkoutStartRef.current = false;
  }, [workoutState.id]);

  const currentSectionElapsed = sectionElapsedSeconds[sectionIndex] ?? 0;
  const timerActiveForCurrentSection =
    runningSectionIndex === sectionIndex && isTimerRunning;

  const sessionSectionTiming = sectionElapsedSeconds;

  return (
    <>
      <WorkoutPlayerShell
        workout={workoutState}
        onSafetyToggle={setSafetyMode}
        hideTopChrome={focusMode}
      >
        {inBlockSession ? (
          <>
            {/* Section timer — only while in an active block session */}
            <div
              className={cn(
                "shrink-0 sticky top-0 z-40 border-b backdrop-blur-sm transition-colors",
                timerActiveForCurrentSection
                  ? "border-primary/45 bg-primary/12 shadow-md"
                  : currentSectionElapsed > 0
                    ? "border-border bg-card/95"
                    : "border-border bg-card/95"
              )}
            >
              <div className="flex flex-col gap-3 py-3 px-3 sm:px-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center justify-between gap-2 sm:contents">
                  <div className="flex items-center gap-2 min-w-0 sm:max-w-[min(40%,14rem)] sm:shrink-0">
                    <Timer
                      className={cn(
                        "size-5 shrink-0",
                        timerActiveForCurrentSection
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Block timer
                      </p>
                      <p className="text-sm font-semibold leading-tight truncate">
                        {currentSection?.type ?? "Section"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:order-3 sm:ml-auto sm:shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        timerActiveForCurrentSection ? "secondary" : "default"
                      }
                      onClick={handleSectionTimerToggle}
                      className="min-h-9 min-w-[4.5rem]"
                    >
                      {timerActiveForCurrentSection
                        ? "Pause"
                        : runningSectionIndex === sectionIndex
                          ? "Resume"
                          : "Start"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSectionTimerReset}
                      className="min-h-9"
                    >
                      Reset
                    </Button>
                    {focusMode && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="gap-1 min-h-9"
                        onClick={() => setChromeUnlocked(true)}
                      >
                        <PanelTop className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Show header</span>
                      </Button>
                    )}
                    {isTimerRunning && chromeUnlocked && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-h-9"
                        onClick={() => setChromeUnlocked(false)}
                      >
                        Hide header
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 sm:flex-1 sm:order-2 sm:min-w-0">
                  <span
                    className={cn(
                      "tabular-nums font-mono font-bold tracking-tight leading-none",
                      timerActiveForCurrentSection
                        ? "text-4xl text-primary sm:text-5xl"
                        : currentSectionElapsed > 0
                          ? "text-3xl text-foreground sm:text-4xl"
                          : "text-3xl text-muted-foreground sm:text-4xl"
                    )}
                    aria-live="polite"
                    aria-label={`Section elapsed time ${formatSectionElapsed(currentSectionElapsed)}`}
                  >
                    {formatSectionElapsed(currentSectionElapsed)}
                  </span>
                  {timerActiveForCurrentSection && (
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-primary motion-reduce:animate-none animate-pulse">
                      Timing
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!focusMode && exercises.length > 0 && (
              <div className="bg-card pt-2 pb-2 pl-4 border-b border-border">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pr-4">
                  {exercises.map((exercise, idx) => (
                    <button
                      key={`${exercise.name}-${idx}`}
                      type="button"
                      onClick={() => handleExerciseChipClick(idx)}
                      className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors duration-150",
                        currentExerciseIndex === idx
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:text-primary hover:border-primary/60"
                      )}
                    >
                      {exercise.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <main className="flex-1 min-h-0 overflow-auto p-4 pb-28 lg:px-6 xl:px-8">
              {!currentSection?.exercises?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    This section has no exercises.
                  </p>
                </div>
              ) : currentExercise ? (
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-center gap-4 mb-4 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExerciseNavigate("prev")}
                      disabled={isFirstExercise}
                      aria-label="Previous exercise"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                      {currentExerciseIndex + 1} of {exercises.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExerciseNavigate("next")}
                      disabled={isLastExercise}
                      aria-label="Next exercise"
                    >
                      Next
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  </div>

                  <ManualExerciseCard
                    exercise={currentExercise}
                    exerciseId={`${sectionIndex}-${currentExerciseIndex}`}
                    sectionIdx={sectionIndex}
                    exerciseIdx={currentExerciseIndex}
                    safetyMode={safetyMode}
                    reasoning={getExerciseReasoning(
                      sectionIndex,
                      currentExerciseIndex
                    )}
                    trustBadges={getExerciseTrustBadges(
                      sectionIndex,
                      currentExerciseIndex
                    )}
                    onUpdateSet={handleUpdateSetString}
                    onToggleSetComplete={handleSetComplete}
                    onExerciseComplete={handleExerciseComplete}
                    className="w-full"
                  />
                </div>
              ) : null}
            </main>
          </>
        ) : (
          <main className="flex-1 min-h-0 overflow-auto p-4 pb-28 lg:px-6 xl:px-8">
            <div className="max-w-lg mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Workout blocks
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Open a block for the timer and exercises. When you&apos;re
                  done, use{" "}
                  <span className="font-medium text-foreground">Finish</span>{" "}
                  with the block name to return here and pick the next one.
                </p>
              </div>
              <ul className="space-y-3">
                {PHASE_ORDER.map((phase) => {
                  const data = phaseMap[phase];
                  if (!data) return null;
                  return (
                    <li key={phase}>
                      <button
                        type="button"
                        onClick={() => enterBlockSession(phase)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-colors"
                      >
                        <span className="font-semibold">
                          {data.section.type}
                        </span>
                        <Play
                          className="w-5 h-5 text-primary shrink-0"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {PHASE_ORDER.every((p) => !phaseMap[p]) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No workout blocks with exercises are available yet.
                </p>
              )}
            </div>
          </main>
        )}

        <div className="shrink-0 sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-sm p-3 flex flex-col items-center gap-2">
          {inBlockSession &&
            (currentSectionElapsed > 0 || timerActiveForCurrentSection) && (
              <div
                className={cn(
                  "flex w-full max-w-md items-center justify-between rounded-lg border px-3 py-2",
                  timerActiveForCurrentSection
                    ? "border-primary/35 bg-primary/10"
                    : "border-border bg-muted/40"
                )}
                aria-live="polite"
              >
                <span className="text-xs font-medium text-muted-foreground truncate pr-2">
                  {currentSection?.type ?? "Section"}
                </span>
                <span className="tabular-nums text-lg font-mono font-bold text-foreground shrink-0">
                  {formatSectionElapsed(currentSectionElapsed)}
                </span>
              </div>
            )}
          {inBlockSession && (
            <Button
              type="button"
              variant="outline"
              className="w-full max-w-md"
              onClick={exitBlockSessionToHub}
              aria-label={`Return to block list: ${finishCurrentBlockLabel(currentSection?.type)}`}
            >
              {finishCurrentBlockLabel(currentSection?.type)}
            </Button>
          )}
          <Button
            type="button"
            className="w-full max-w-md"
            onClick={() => {
              setIsTimerRunning(false);
              setChromeUnlocked(false);
              setCompletionOpen(true);
            }}
          >
            Finish workout
          </Button>
        </div>
      </WorkoutPlayerShell>

      <CompletionModal
        workout={completionOpen ? workoutState : null}
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        sessionSectionTiming={sessionSectionTiming}
        analyticsSurface={analytics?.surface}
        workoutAttemptId={analytics?.workoutAttemptId}
      />
    </>
  );
}
