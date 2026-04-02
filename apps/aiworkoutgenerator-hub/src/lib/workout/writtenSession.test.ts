import { describe, it, expect } from "vitest";

import {
  adjustFocusAfterExerciseInsert,
  createEmptySession,
  flatIndexFromParts,
  sectionIndexFromFlatExerciseIndex,
  getSegmentSeconds,
  getTotalSessionSeconds,
  parseStoredSession,
  reduceWrittenSession,
  serializeSession,
  type WrittenSessionState,
} from "./writtenSession";

const W = "w1";
const U = "u1";

describe("reduceWrittenSession", () => {
  it("START_WORKOUT moves to active_work and clears prior ended session", () => {
    let s = createEmptySession(W, U);
    s = {
      ...s,
      status: "idle",
      sessionStartedAt: 1000,
      sessionEndedAt: 5000,
      splits: [{ kind: "work", seconds: 4, recordedAt: 5000 }],
    };
    const next = reduceWrittenSession(
      s,
      { type: "START_WORKOUT", now: 10_000 },
      W,
      U
    );
    expect(next.status).toBe("active_work");
    expect(next.sessionEndedAt).toBeNull();
    expect(next.splits).toEqual([]);
    expect(next.sessionStartedAt).toBe(10_000);
    expect(next.segmentStartedAt).toBe(10_000);
    expect(next.focusedExerciseFlatIndex).toBe(0);
  });

  it("LAP from active_work records work split and enters rest", () => {
    let s = createEmptySession(W, U);
    s = reduceWrittenSession(s, { type: "START_WORKOUT", now: 0 }, W, U);
    const next = reduceWrittenSession(
      s,
      { type: "LAP", now: 60_000, maxExerciseIndex: 10 },
      W,
      U
    );
    expect(next.status).toBe("rest");
    expect(next.splits).toEqual([
      { kind: "work", seconds: 60, recordedAt: 60_000 },
    ]);
    expect(next.segmentStartedAt).toBe(60_000);
  });

  it("LAP from rest records rest split and enters active_work", () => {
    let s = createEmptySession(W, U);
    s = reduceWrittenSession(s, { type: "START_WORKOUT", now: 0 }, W, U);
    s = reduceWrittenSession(
      s,
      { type: "LAP", now: 60_000, maxExerciseIndex: 10 },
      W,
      U
    );
    const next = reduceWrittenSession(
      s,
      { type: "LAP", now: 90_000, maxExerciseIndex: 10 },
      W,
      U
    );
    expect(next.status).toBe("active_work");
    expect(next.focusedExerciseFlatIndex).toBe(1);
    expect(next.splits).toHaveLength(2);
    expect(next.splits[1]).toEqual({
      kind: "rest",
      seconds: 30,
      recordedAt: 90_000,
    });
  });

  it("LAP rest→work caps focusedExerciseFlatIndex at maxExerciseIndex", () => {
    let s = createEmptySession(W, U);
    s = reduceWrittenSession(s, { type: "START_WORKOUT", now: 0 }, W, U);
    s = reduceWrittenSession(
      s,
      { type: "LAP", now: 60_000, maxExerciseIndex: 0 },
      W,
      U
    );
    const next = reduceWrittenSession(
      s,
      { type: "LAP", now: 90_000, maxExerciseIndex: 0 },
      W,
      U
    );
    expect(next.focusedExerciseFlatIndex).toBe(0);
  });

  it("END_SESSION records final segment and freezes wall clock", () => {
    let s = createEmptySession(W, U);
    s = reduceWrittenSession(s, { type: "START_WORKOUT", now: 0 }, W, U);
    const next = reduceWrittenSession(
      s,
      { type: "END_SESSION", now: 120_000 },
      W,
      U
    );
    expect(next.status).toBe("idle");
    expect(next.sessionEndedAt).toBe(120_000);
    expect(next.segmentStartedAt).toBeNull();
    expect(next.splits.length).toBe(1);
    expect(next.splits[0]?.kind).toBe("work");
    expect(next.splits[0]?.seconds).toBe(120);
  });

  it("HYDRATE rejects mismatched workoutId", () => {
    const empty = createEmptySession(W, U);
    const foreign: WrittenSessionState = {
      ...createEmptySession("other", U),
      splits: [{ kind: "work", seconds: 1, recordedAt: 1 }],
      focusedExerciseFlatIndex: 0,
    };
    const next = reduceWrittenSession(
      empty,
      { type: "HYDRATE", payload: foreign },
      W,
      U
    );
    expect(next.splits).toEqual([]);
  });
});

describe("storage round-trip", () => {
  it("serialize and parse restore state", () => {
    const s = createEmptySession(W, U);
    const started = reduceWrittenSession(
      s,
      { type: "START_WORKOUT", now: 100 },
      W,
      U
    );
    const raw = serializeSession(started);
    const parsed = parseStoredSession(raw);
    expect(parsed?.status).toBe("active_work");
    expect(parsed?.workoutId).toBe(W);
  });
});

describe("getTotalSessionSeconds", () => {
  it("uses sessionEndedAt when idle after end", () => {
    const s: WrittenSessionState = {
      version: 1,
      workoutId: W,
      userId: U,
      status: "idle",
      sessionStartedAt: 0,
      sessionEndedAt: 100_000,
      segmentStartedAt: null,
      splits: [],
      focusedExerciseFlatIndex: 0,
    };
    expect(getTotalSessionSeconds(s, 200_000)).toBe(100);
  });

  it("tracks running session", () => {
    const s: WrittenSessionState = {
      version: 1,
      workoutId: W,
      userId: U,
      status: "active_work",
      sessionStartedAt: 0,
      sessionEndedAt: null,
      segmentStartedAt: 0,
      splits: [],
      focusedExerciseFlatIndex: 0,
    };
    expect(getTotalSessionSeconds(s, 45_000)).toBe(45);
  });
});

describe("getSegmentSeconds", () => {
  it("returns elapsed for active segment", () => {
    const s: WrittenSessionState = {
      version: 1,
      workoutId: W,
      userId: U,
      status: "rest",
      sessionStartedAt: 0,
      sessionEndedAt: null,
      segmentStartedAt: 100_000,
      splits: [],
      focusedExerciseFlatIndex: 0,
    };
    expect(getSegmentSeconds(s, 130_000)).toBe(30);
  });
});

describe("flatIndexFromParts", () => {
  const sections = [{ exercises: [{}, {}] }, { exercises: [{}] }];

  it("returns flat index for first section", () => {
    expect(flatIndexFromParts(0, 0, sections)).toBe(0);
    expect(flatIndexFromParts(0, 1, sections)).toBe(1);
  });

  it("returns flat index for second section", () => {
    expect(flatIndexFromParts(1, 0, sections)).toBe(2);
  });
});

describe("sectionIndexFromFlatExerciseIndex", () => {
  const sections = [{ exercises: [{}, {}] }, { exercises: [{}] }];

  it("returns null for empty or negative index", () => {
    expect(sectionIndexFromFlatExerciseIndex(0, [])).toBe(null);
    expect(sectionIndexFromFlatExerciseIndex(-1, sections)).toBe(null);
  });

  it("maps flat index back to section", () => {
    expect(sectionIndexFromFlatExerciseIndex(0, sections)).toBe(0);
    expect(sectionIndexFromFlatExerciseIndex(1, sections)).toBe(0);
    expect(sectionIndexFromFlatExerciseIndex(2, sections)).toBe(1);
  });

  it("returns null when flat index is past last exercise", () => {
    expect(sectionIndexFromFlatExerciseIndex(3, sections)).toBe(null);
  });
});

describe("adjustFocusAfterExerciseInsert", () => {
  const active: WrittenSessionState = {
    ...createEmptySession(W, U),
    status: "active_work",
    sessionStartedAt: 0,
    segmentStartedAt: 0,
    focusedExerciseFlatIndex: 2,
  };

  it("does not change idle session", () => {
    const idle = createEmptySession(W, U);
    const next = adjustFocusAfterExerciseInsert(idle, 0, 5);
    expect(next.focusedExerciseFlatIndex).toBe(0);
  });

  it("bumps focus when insert is at or before focus", () => {
    const next = adjustFocusAfterExerciseInsert(active, 2, 5);
    expect(next.focusedExerciseFlatIndex).toBe(3);
  });

  it("does not bump when insert is after focus", () => {
    const next = adjustFocusAfterExerciseInsert(active, 3, 5);
    expect(next.focusedExerciseFlatIndex).toBe(2);
  });
});
