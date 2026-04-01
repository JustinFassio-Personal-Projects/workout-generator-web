import { describe, it, expect } from "vitest";
import {
  getExerciseCompletionPercentRounded,
  countExercisesCompleted,
} from "./exerciseCompletionPercent";
import type { TrainerWorkout } from "@/types/firestore";

function workoutWithCompleted(completedFlags: boolean[]): TrainerWorkout {
  return {
    id: "w1",
    user_id: "u1",
    title: "T",
    sections: [
      {
        type: "Warmup",
        durationEstimate: "5 min",
        exercises: completedFlags.map((c, i) => ({
          name: `Ex ${i}`,
          sets: 1,
          muscleTarget: "Chest",
          tempo: null,
          cues: [],
          detailedInstructions: null,
          setDetails: [],
          equipment_needed: [],
          muscle_groups: [],
          completed: c,
        })),
      },
    ],
  } as unknown as TrainerWorkout;
}

describe("getExerciseCompletionPercentRounded", () => {
  it("returns 100 when no sections", () => {
    expect(
      getExerciseCompletionPercentRounded({
        id: "w",
        sections: [],
      } as unknown as TrainerWorkout)
    ).toBe(100);
  });

  it("rounds to nearest 10%", () => {
    expect(
      getExerciseCompletionPercentRounded(workoutWithCompleted([true, false]))
    ).toBe(50);
    expect(
      getExerciseCompletionPercentRounded(
        workoutWithCompleted([true, false, false])
      )
    ).toBe(30);
  });
});

describe("countExercisesCompleted", () => {
  it("counts exercises", () => {
    expect(countExercisesCompleted(workoutWithCompleted([true, true]))).toEqual(
      { completed: 2, total: 2 }
    );
  });
});
