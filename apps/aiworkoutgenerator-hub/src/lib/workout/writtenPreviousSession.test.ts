import { describe, it, expect } from "vitest";
import {
  normalizeExerciseName,
  findSessionExerciseByName,
  formatPreviousSetLabel,
  getPreviousSetLabelsForExercise,
} from "./writtenPreviousSession";
import type { WorkoutSummary } from "@/types/workoutSummary";

describe("normalizeExerciseName", () => {
  it("trims and lowercases", () => {
    expect(normalizeExerciseName("  Bench Press  ")).toBe("bench press");
  });
});

describe("findSessionExerciseByName", () => {
  it("finds first match case-insensitively", () => {
    const summary = {
      sections: [
        {
          type: "Main" as const,
          exercises: [
            {
              name: "Squat",
              muscleTarget: "Legs",
              tempo: null,
              setsPlanned: 3,
              setsCompleted: 3,
              averageRestSeconds: null,
              cues: [],
              setDetails: [
                {
                  index: 0,
                  reps: "5",
                  weight: "",
                  actualWeight: "315",
                  rest: "180s",
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WorkoutSummary;

    const ex = findSessionExerciseByName(summary, "squat");
    expect(ex?.name).toBe("Squat");
  });

  it("returns undefined when missing", () => {
    expect(findSessionExerciseByName(null, "x")).toBeUndefined();
  });
});

describe("formatPreviousSetLabel", () => {
  it("formats weight x reps", () => {
    expect(
      formatPreviousSetLabel({
        reps: "8",
        weight: "RPE 8",
        actualWeight: "185",
        rest: "90s",
      })
    ).toBe("185 × 8");
  });

  it("returns em dash when empty", () => {
    expect(formatPreviousSetLabel(undefined)).toBe("—");
  });
});

describe("getPreviousSetLabelsForExercise", () => {
  it("pads with dash for extra current sets", () => {
    const summary = {
      sections: [
        {
          type: "Main" as const,
          exercises: [
            {
              name: "Curl",
              muscleTarget: "Biceps",
              tempo: null,
              setsPlanned: 1,
              setsCompleted: 1,
              averageRestSeconds: null,
              cues: [],
              setDetails: [
                {
                  index: 0,
                  reps: "10",
                  weight: "",
                  actualWeight: "30",
                  rest: "60s",
                },
              ],
            },
          ],
        },
      ],
    } as unknown as WorkoutSummary;

    const labels = getPreviousSetLabelsForExercise(summary, "Curl", 3);
    expect(labels).toEqual(["30 × 10", "—", "—"]);
  });
});
