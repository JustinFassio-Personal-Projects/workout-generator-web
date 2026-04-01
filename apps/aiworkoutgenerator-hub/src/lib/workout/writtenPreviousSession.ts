import type { SessionExerciseSummary } from "@/types/sessionSummary";
import type { TrainerSetDetail } from "@/types/firestore";
import type { WorkoutSummary } from "@/types/workoutSummary";

export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * First matching exercise in section order (flattened) from the last summary.
 */
export function findSessionExerciseByName(
  summary: WorkoutSummary | null,
  exerciseName: string
): SessionExerciseSummary | undefined {
  if (!summary?.sections?.length) return undefined;
  const key = normalizeExerciseName(exerciseName);
  for (const section of summary.sections) {
    for (const ex of section.exercises || []) {
      if (normalizeExerciseName(ex.name) === key) {
        return ex;
      }
    }
  }
  return undefined;
}

/**
 * Per-set label for the "Previous" column: `weight x reps` from last session.
 */
export function formatPreviousSetLabel(
  set: TrainerSetDetail | undefined
): string {
  if (!set) return "—";
  const w = (set.actualWeight || set.weight || "").trim();
  const r = (set.reps || "").trim();
  if (w && r) return `${w} × ${r}`;
  if (w) return w;
  if (r) return r;
  return "—";
}

/**
 * One label per current set row; pads with "—" when previous session had fewer sets.
 */
export function getPreviousSetLabelsForExercise(
  summary: WorkoutSummary | null,
  exerciseName: string,
  currentSetCount: number
): string[] {
  const prev = findSessionExerciseByName(summary, exerciseName);
  const details = prev?.setDetails ?? [];
  const out: string[] = [];
  for (let i = 0; i < currentSetCount; i++) {
    out.push(formatPreviousSetLabel(details[i]));
  }
  return out;
}
