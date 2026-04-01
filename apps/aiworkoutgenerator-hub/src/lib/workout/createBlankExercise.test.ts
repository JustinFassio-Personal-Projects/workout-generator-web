import { describe, expect, it } from "vitest";

import {
  createBlankTrainerExercise,
  createEmptySection,
} from "./createBlankExercise";

describe("createBlankTrainerExercise", () => {
  it("creates defaults with three sets", () => {
    const ex = createBlankTrainerExercise();
    expect(ex.name).toBe("New exercise");
    expect(ex.setDetails).toHaveLength(3);
    expect(ex.sets).toBe(3);
    expect(ex.muscleTarget).toBe("General");
  });

  it("respects override setDetails length", () => {
    const ex = createBlankTrainerExercise({
      setDetails: [
        { reps: "10", weight: "", rest: "60s" },
        { reps: "10", weight: "", rest: "60s" },
      ],
    });
    expect(ex.setDetails).toHaveLength(2);
    expect(ex.sets).toBe(2);
  });
});

describe("createEmptySection", () => {
  it("includes one blank exercise", () => {
    const s = createEmptySection("Warmup");
    expect(s.type).toBe("Warmup");
    expect(s.exercises).toHaveLength(1);
    expect(s.exercises[0]?.name).toBe("New exercise");
  });
});
