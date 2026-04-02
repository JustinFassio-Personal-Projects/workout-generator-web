"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  useLayoutEffect,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  Printer,
  ScrollText,
} from "lucide-react";

import type {
  TrainerWorkout,
  TrainerWorkoutExercise,
  TrainerWorkoutSection,
  WorkoutSectionType,
} from "@/types/firestore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompletionModal } from "@/components/history/CompletionModal";
import { useSession } from "@/lib/session-tracker";
import { logUserActivity } from "@/lib/user-activity-logger";
import { useWorkoutAnalyticsAttempt } from "@/contexts/WorkoutAnalyticsAttemptContext";
import { useWrittenWorkoutSession } from "@/hooks/useWrittenWorkoutSession";
import { useWrittenWorkoutFirestoreState } from "@/hooks/useWrittenWorkoutFirestoreState";
import {
  createBlankTrainerExercise,
  createEmptySection,
} from "@/lib/workout/createBlankExercise";
import {
  flatIndexFromParts,
  maxFlattenedExerciseIndex,
  type WrittenSessionState,
} from "@/lib/workout/writtenSession";
import {
  countExercisesCompleted,
  getExerciseCompletionPercentRounded,
} from "@/lib/workout/exerciseCompletionPercent";
import { cn } from "@/lib/utils";
import { WorkoutSummaryService } from "@/services/summaries/WorkoutSummaryService";
import type { WorkoutSummary } from "@/types/workoutSummary";
import { WrittenWorkoutSessionBar } from "./WrittenWorkoutSessionBar";
import { WrittenExerciseCard } from "./WrittenExerciseCard";
import {
  WrittenExerciseEditSheet,
  type WrittenExerciseEditMode,
} from "./WrittenExerciseEditSheet";
import { WrittenTimerFab } from "./WrittenTimerFab";

const SECTION_TYPE_OPTIONS: WorkoutSectionType[] = [
  "Warmup",
  "Main Workout",
  "Finisher",
  "Cooldown",
];

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const EMPTY_SECTIONS: TrainerWorkoutSection[] = [];

type ExerciseEditState = {
  mode: WrittenExerciseEditMode;
  sectionIdx: number;
  exerciseIdx: number;
  initialExercise: TrainerWorkoutExercise;
} | null;

interface WrittenWorkoutAccordionSectionsProps {
  sectionAccordionIds: string[];
  sections: TrainerWorkoutSection[];
  sessionState: WrittenSessionState;
  lastSummary: WorkoutSummary | null;
  workoutState: TrainerWorkout;
  setExerciseEdit: Dispatch<SetStateAction<ExerciseEditState>>;
  handleUpdateSetString: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    field: string,
    value: string
  ) => void;
  handleSetComplete: (
    sIdx: number,
    eIdx: number,
    setIdx: number,
    completed: boolean
  ) => void;
  handleExerciseComplete: (
    sIdx: number,
    eIdx: number,
    completed: boolean
  ) => void;
  handleAddSet: (sIdx: number, eIdx: number) => void;
}

function WrittenWorkoutAccordionSections({
  sectionAccordionIds,
  sections,
  sessionState,
  lastSummary,
  workoutState,
  setExerciseEdit,
  handleUpdateSetString,
  handleSetComplete,
  handleExerciseComplete,
  handleAddSet,
}: WrittenWorkoutAccordionSectionsProps) {
  const [openSectionIds, setOpenSectionIds] = useState(() => [
    ...sectionAccordionIds,
  ]);

  useEffect(() => {
    const expandFromHash = () => {
      if (typeof window === "undefined") return;
      const id = window.location.hash.replace(/^#/, "");
      if (id.startsWith("written-section-")) {
        setOpenSectionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    };
    queueMicrotask(expandFromHash);
    window.addEventListener("hashchange", expandFromHash);
    return () => window.removeEventListener("hashchange", expandFromHash);
  }, []);

  return (
    <Accordion
      type="multiple"
      className="written-workout-section-accordion space-y-3"
      value={openSectionIds}
      onValueChange={setOpenSectionIds}
    >
      {sections.map((section, sectionIdx) => (
        <AccordionItem
          key={`${section.type}-${sectionIdx}`}
          value={`written-section-${sectionIdx}`}
          id={`written-section-${sectionIdx}`}
          className="scroll-mt-24 border-0 rounded-2xl border border-border bg-card/20 overflow-hidden shadow-sm data-[state=open]:shadow-md"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b border-border/50">
            <div className="flex flex-1 min-w-0 items-baseline justify-between gap-2 pr-2 text-left">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                {section.type}
              </h2>
              {section.durationEstimate?.trim() ? (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {section.durationEstimate}
                </span>
              ) : null}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-4 pt-0 sm:px-3 space-y-4 border-0">
            {(section.exercises ?? []).map((exercise, exerciseIdx) => {
              const flatExerciseIndex = flatIndexFromParts(
                sectionIdx,
                exerciseIdx,
                sections
              );
              const muscle =
                exercise.muscleTarget ||
                exercise.muscle_groups?.join(" · ") ||
                "—";

              const isFocusedExercise =
                sessionState.status !== "idle" &&
                flatExerciseIndex === sessionState.focusedExerciseFlatIndex;

              return (
                <WrittenExerciseCard
                  key={`written-exercise-${sectionIdx}-${exerciseIdx}`}
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
                  onEditExercise={() => {
                    const ex =
                      workoutState.sections?.[sectionIdx]?.exercises?.[
                        exerciseIdx
                      ];
                    if (!ex) return;
                    setExerciseEdit({
                      mode: "edit",
                      sectionIdx,
                      exerciseIdx,
                      initialExercise: structuredClone(ex),
                    });
                  }}
                  onAddExerciseBefore={() => {
                    setExerciseEdit({
                      mode: "insert-before",
                      sectionIdx,
                      exerciseIdx,
                      initialExercise: createBlankTrainerExercise(),
                    });
                  }}
                  onAddExerciseAfter={() => {
                    setExerciseEdit({
                      mode: "insert-after",
                      sectionIdx,
                      exerciseIdx,
                      initialExercise: createBlankTrainerExercise(),
                    });
                  }}
                />
              );
            })}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
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
  const { sessionId } = useSession();
  const analytics = useWorkoutAnalyticsAttempt();
  const loggedWorkoutStartRef = useRef(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [lastSummary, setLastSummary] = useState<WorkoutSummary | null>(null);
  const [sessionTimerVisible, setSessionTimerVisible] = useState(true);

  const {
    workoutState,
    handleUpdateSetString,
    handleSetComplete,
    handleExerciseComplete,
    handleAddSet,
    replaceExerciseAt,
    insertExerciseAt,
    appendSection,
  } = useWrittenWorkoutFirestoreState(workout);

  const {
    state: sessionState,
    totalSeconds,
    segmentSeconds,
    startWorkout,
    lap,
    endSession,
    resetSession,
    bumpFocusAfterExerciseInsertAt,
  } = useWrittenWorkoutSession(workoutState.id, userId);

  const handleStartWorkout = useCallback(() => {
    startWorkout();
    if (loggedWorkoutStartRef.current || !analytics || !workoutState.id) {
      return;
    }
    loggedWorkoutStartRef.current = true;
    void logUserActivity(
      userId,
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
  }, [startWorkout, userId, analytics, workoutState.id, sessionId]);

  const [exerciseEdit, setExerciseEdit] = useState<{
    mode: WrittenExerciseEditMode;
    sectionIdx: number;
    exerciseIdx: number;
    initialExercise: TrainerWorkoutExercise;
  } | null>(null);

  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionType, setNewSectionType] =
    useState<WorkoutSectionType>("Main Workout");

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

  const sections = useMemo(
    () => workoutState.sections ?? EMPTY_SECTIONS,
    [workoutState.sections]
  );
  const maxExerciseFlatIndex = maxFlattenedExerciseIndex(sections);

  const sectionAccordionIds = useMemo(
    () => sections.map((_, i) => `written-section-${i}`),
    [sections]
  );

  const sectionsLayoutKey = useMemo(
    () => `${workoutState.id}|${sectionAccordionIds.join("|")}`,
    [workoutState.id, sectionAccordionIds]
  );

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

        {sections.length > 0 ? (
          <WrittenWorkoutAccordionSections
            key={sectionsLayoutKey}
            sectionAccordionIds={sectionAccordionIds}
            sections={sections}
            sessionState={sessionState}
            lastSummary={lastSummary}
            workoutState={workoutState}
            setExerciseEdit={setExerciseEdit}
            handleUpdateSetString={handleUpdateSetString}
            handleSetComplete={handleSetComplete}
            handleExerciseComplete={handleExerciseComplete}
            handleAddSet={handleAddSet}
          />
        ) : null}

        <div className="written-workout-no-print">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-sky-500/35 hover:bg-sky-500/10"
            onClick={() => setAddSectionOpen(true)}
          >
            <Layers className="h-4 w-4 mr-2" />
            Add section
          </Button>
        </div>

        {sections.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            No exercises in this workout. Add a section to get started.
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
          onStartWorkout={handleStartWorkout}
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

      <WrittenExerciseEditSheet
        open={exerciseEdit !== null}
        onOpenChange={(o) => {
          if (!o) setExerciseEdit(null);
        }}
        mode={exerciseEdit?.mode ?? "edit"}
        initialExercise={
          exerciseEdit?.initialExercise ?? createBlankTrainerExercise()
        }
        onSave={(ex) => {
          const ctx = exerciseEdit;
          if (!ctx) return;
          setExerciseEdit(null);
          const { mode, sectionIdx, exerciseIdx } = ctx;
          const currentSections = workoutState.sections || [];
          const countBefore = currentSections.reduce(
            (sum, s) => sum + (s.exercises?.length ?? 0),
            0
          );
          if (mode === "edit") {
            replaceExerciseAt(sectionIdx, exerciseIdx, ex);
            return;
          }
          if (mode === "insert-before") {
            const insertFlat = flatIndexFromParts(
              sectionIdx,
              exerciseIdx,
              currentSections
            );
            insertExerciseAt(sectionIdx, exerciseIdx, ex);
            bumpFocusAfterExerciseInsertAt(insertFlat, countBefore);
            return;
          }
          const insertAt = exerciseIdx + 1;
          const insertFlat = flatIndexFromParts(
            sectionIdx,
            insertAt,
            currentSections
          );
          insertExerciseAt(sectionIdx, insertAt, ex);
          bumpFocusAfterExerciseInsertAt(insertFlat, countBefore);
        }}
      />

      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add section</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="written-new-section-type">Section type</Label>
            <Select
              value={newSectionType}
              onValueChange={(v) => setNewSectionType(v as WorkoutSectionType)}
            >
              <SelectTrigger id="written-new-section-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Adds a new block with one blank exercise you can edit and log.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddSectionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-sky-600 text-white hover:bg-sky-500"
              onClick={() => {
                appendSection(createEmptySection(newSectionType));
                setAddSectionOpen(false);
              }}
            >
              Add section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CompletionModal
        workout={completionOpen ? workoutState : null}
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        analyticsSurface={analytics?.surface}
        workoutAttemptId={analytics?.workoutAttemptId}
      />
    </div>
  );
}
