/**
 * Pure session logic for Written workout: alternating work/rest segments with splits.
 * Persisted via localStorage from useWrittenWorkoutSession (see storage helpers below).
 */

export type WrittenSessionStatus = "idle" | "active_work" | "rest";

export interface WrittenSplit {
  kind: "work" | "rest";
  seconds: number;
  recordedAt: number;
}

export interface WrittenSessionState {
  version: 1;
  workoutId: string;
  userId: string;
  status: WrittenSessionStatus;
  sessionStartedAt: number | null;
  /** Set when user ends session; wall clock stops */
  sessionEndedAt: number | null;
  segmentStartedAt: number | null;
  splits: WrittenSplit[];
  /** Flat index into the workout’s exercise list (0 = first exercise); advances on rest → work */
  focusedExerciseFlatIndex: number;
}

export const WRITTEN_SESSION_VERSION = 1 as const;

export function createEmptySession(
  workoutId: string,
  userId: string
): WrittenSessionState {
  return {
    version: WRITTEN_SESSION_VERSION,
    workoutId,
    userId,
    status: "idle",
    sessionStartedAt: null,
    sessionEndedAt: null,
    segmentStartedAt: null,
    splits: [],
    focusedExerciseFlatIndex: 0,
  };
}

function elapsedSeconds(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 1000));
}

export function reduceWrittenSession(
  state: WrittenSessionState,
  action:
    | { type: "START_WORKOUT"; now: number }
    /** maxExerciseIndex: last valid flat index (exercise count − 1), used when rest → work */
    | { type: "LAP"; now: number; maxExerciseIndex: number }
    | { type: "END_SESSION"; now: number }
    | { type: "RESET" }
    | { type: "HYDRATE"; payload: WrittenSessionState },
  workoutId: string,
  userId: string
): WrittenSessionState {
  if (action.type === "HYDRATE") {
    if (
      action.payload.workoutId === workoutId &&
      action.payload.userId === userId &&
      action.payload.version === WRITTEN_SESSION_VERSION
    ) {
      return action.payload;
    }
    return createEmptySession(workoutId, userId);
  }

  if (action.type === "RESET") {
    return createEmptySession(workoutId, userId);
  }

  if (state.workoutId !== workoutId || state.userId !== userId) {
    return createEmptySession(workoutId, userId);
  }

  const now = action.now;

  switch (action.type) {
    case "START_WORKOUT": {
      if (state.status !== "idle") return state;
      return {
        ...state,
        status: "active_work",
        sessionStartedAt: now,
        sessionEndedAt: null,
        segmentStartedAt: now,
        splits: [],
        focusedExerciseFlatIndex: 0,
      };
    }
    case "LAP": {
      if (
        state.status === "idle" ||
        state.sessionStartedAt === null ||
        state.segmentStartedAt === null
      ) {
        return state;
      }
      const seg = elapsedSeconds(state.segmentStartedAt, now);
      const cap = Math.max(0, action.maxExerciseIndex);
      if (state.status === "active_work") {
        return {
          ...state,
          status: "rest",
          segmentStartedAt: now,
          splits: [
            ...state.splits,
            { kind: "work", seconds: seg, recordedAt: now },
          ],
        };
      }
      if (state.status === "rest") {
        const nextFocus = Math.min(state.focusedExerciseFlatIndex + 1, cap);
        return {
          ...state,
          status: "active_work",
          segmentStartedAt: now,
          focusedExerciseFlatIndex: nextFocus,
          splits: [
            ...state.splits,
            { kind: "rest", seconds: seg, recordedAt: now },
          ],
        };
      }
      return state;
    }
    case "END_SESSION": {
      if (state.status === "idle") return state;
      let splits = state.splits;
      const sessionEndedAt = now;
      if (
        (state.status === "active_work" || state.status === "rest") &&
        state.segmentStartedAt !== null
      ) {
        const seg = elapsedSeconds(state.segmentStartedAt, now);
        splits = [
          ...state.splits,
          {
            kind: state.status === "active_work" ? "work" : "rest",
            seconds: seg,
            recordedAt: now,
          },
        ];
      }
      return {
        ...state,
        status: "idle",
        sessionEndedAt,
        segmentStartedAt: null,
        splits,
      };
    }
    default:
      return state;
  }
}

export function storageKey(userId: string, workoutId: string): string {
  return `writtenWorkoutSession:${userId}:${workoutId}`;
}

export function parseStoredSession(
  raw: string | null
): WrittenSessionState | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as WrittenSessionState).version === WRITTEN_SESSION_VERSION
    ) {
      const s = parsed as WrittenSessionState;
      return {
        ...s,
        focusedExerciseFlatIndex:
          typeof s.focusedExerciseFlatIndex === "number"
            ? s.focusedExerciseFlatIndex
            : 0,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function serializeSession(state: WrittenSessionState): string {
  return JSON.stringify(state);
}

/** Total session wall time in seconds (running or completed). */
export function getTotalSessionSeconds(
  state: WrittenSessionState,
  nowMs: number
): number {
  if (state.sessionStartedAt === null) return 0;
  if (state.sessionEndedAt !== null) {
    return elapsedSeconds(state.sessionStartedAt, state.sessionEndedAt);
  }
  if (state.status !== "idle") {
    return elapsedSeconds(state.sessionStartedAt, nowMs);
  }
  return 0;
}

/** Last valid flat exercise index for this workout (0 when no exercises). */
export function maxFlattenedExerciseIndex(
  sections: { exercises?: unknown[] | null }[] | null | undefined
): number {
  const n =
    sections?.reduce((sum, s) => sum + (s.exercises?.length ?? 0), 0) ?? 0;
  return Math.max(0, n - 1);
}

/** Flat list index for sectionIdx + exerciseIdx (0-based). */
export function flatIndexFromParts(
  sectionIdx: number,
  exerciseIdx: number,
  sections: { exercises?: unknown[] | null }[] | null | undefined
): number {
  if (!sections?.length) return 0;
  let sum = 0;
  for (let s = 0; s < sectionIdx; s++) {
    sum += sections[s]?.exercises?.length ?? 0;
  }
  return sum + exerciseIdx;
}

/** Inverse of flatIndexFromParts: section index containing the exercise at flatIndex, or null if out of range. */
export function sectionIndexFromFlatExerciseIndex(
  flatIndex: number,
  sections: { exercises?: unknown[] | null }[] | null | undefined
): number | null {
  if (!sections?.length || flatIndex < 0) return null;
  let remaining = flatIndex;
  for (let i = 0; i < sections.length; i++) {
    const count = sections[i]?.exercises?.length ?? 0;
    if (remaining < count) return i;
    remaining -= count;
  }
  return null;
}

/**
 * After inserting one exercise at insertFlatIndex, bump session focus if it
 * pointed at or after that slot so highlighting stays on the same logical exercise.
 */
export function adjustFocusAfterExerciseInsert(
  state: WrittenSessionState,
  insertFlatIndex: number,
  newMaxFlatIndex: number
): WrittenSessionState {
  if (state.status === "idle") return state;
  const next = state.focusedExerciseFlatIndex;
  if (next >= insertFlatIndex) {
    return {
      ...state,
      focusedExerciseFlatIndex: Math.min(next + 1, newMaxFlatIndex),
    };
  }
  return state;
}

/** Current work or rest segment elapsed seconds (0 if idle). */
export function getSegmentSeconds(
  state: WrittenSessionState,
  nowMs: number
): number {
  if (
    (state.status !== "active_work" && state.status !== "rest") ||
    state.segmentStartedAt === null
  ) {
    return 0;
  }
  return elapsedSeconds(state.segmentStartedAt, nowMs);
}
