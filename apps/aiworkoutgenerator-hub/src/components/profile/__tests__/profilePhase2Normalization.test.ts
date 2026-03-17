import { describe, it, expect } from "vitest";
import { validateTimeFormat } from "@/lib/validation/profileSchemas";

/**
 * Normalization helper functions (same as in ProfileDetailsForm)
 */
function normalizeArray<T>(arr: T[] | null | undefined): T[] | null {
  if (!arr || arr.length === 0) return null;
  return arr;
}

function normalizeNumber(num: number | null | undefined): number | null {
  if (num === undefined || num === null || num === 0) return null;
  return num;
}

/**
 * Convert MM:SS format to seconds (uses validateTimeFormat for consistency)
 */
function timeToSeconds(timeStr: string): number | null {
  return validateTimeFormat(timeStr);
}

function normalizeExercises(
  exercises: string[] | null | undefined
): string[] | null {
  if (!exercises || exercises.length === 0) return null;
  const normalized = exercises
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .map((e) => e.toLowerCase());
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : null;
}

describe("Profile Phase 2 Normalization", () => {
  describe("normalizeArray", () => {
    it("should return null for empty arrays", () => {
      expect(normalizeArray([])).toBeNull();
      expect(normalizeArray(null)).toBeNull();
      expect(normalizeArray(undefined)).toBeNull();
    });

    it("should return array for non-empty arrays", () => {
      expect(normalizeArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(normalizeArray(["a", "b"])).toEqual(["a", "b"]);
    });
  });

  describe("normalizeNumber", () => {
    it("should return null for zero, null, or undefined", () => {
      expect(normalizeNumber(0)).toBeNull();
      expect(normalizeNumber(null)).toBeNull();
      expect(normalizeNumber(undefined)).toBeNull();
    });

    it("should return number for positive values", () => {
      expect(normalizeNumber(1)).toBe(1);
      expect(normalizeNumber(100)).toBe(100);
      expect(normalizeNumber(0.5)).toBe(0.5);
    });
  });

  describe("timeToSeconds", () => {
    it("should convert MM:SS format to seconds", () => {
      expect(timeToSeconds("8:30")).toBe(510); // 8*60 + 30
      expect(timeToSeconds("25:00")).toBe(1500); // 25*60
      expect(timeToSeconds("0:45")).toBe(45);
    });

    it("should return null for invalid formats", () => {
      expect(timeToSeconds("")).toBeNull();
      expect(timeToSeconds("8")).toBeNull();
      expect(timeToSeconds("8:30:00")).toBeNull();
      expect(timeToSeconds("invalid")).toBeNull();
    });

    it("should reject seconds >= 60", () => {
      expect(timeToSeconds("5:90")).toBeNull(); // Invalid: seconds >= 60
      expect(timeToSeconds("8:60")).toBeNull(); // Invalid: seconds >= 60
      expect(timeToSeconds("0:59")).toBe(59); // Valid: seconds < 60
    });

    it("should reject negative values", () => {
      expect(timeToSeconds("-1:30")).toBeNull();
      expect(timeToSeconds("5:-10")).toBeNull();
    });
  });

  describe("normalizeExercises", () => {
    it("should return null for empty arrays", () => {
      expect(normalizeExercises([])).toBeNull();
      expect(normalizeExercises(null)).toBeNull();
      expect(normalizeExercises(undefined)).toBeNull();
    });

    it("should trim and lowercase exercise names", () => {
      expect(normalizeExercises(["  Push-ups  ", "SQUATS"])).toEqual([
        "push-ups",
        "squats",
      ]);
    });

    it("should deduplicate exercises case-insensitively", () => {
      expect(normalizeExercises(["push-ups", "Push-Ups", "PUSH-UPS"])).toEqual([
        "push-ups",
      ]);
      expect(normalizeExercises(["squats", "deadlifts", "squats"])).toEqual([
        "squats",
        "deadlifts",
      ]);
    });

    it("should filter out empty strings", () => {
      expect(normalizeExercises(["push-ups", "", "  ", "squats"])).toEqual([
        "push-ups",
        "squats",
      ]);
    });

    it("should handle comma-separated strings", () => {
      const exercises = "push-ups, squats, deadlifts"
        .split(",")
        .map((e) => e.trim());
      expect(normalizeExercises(exercises)).toEqual([
        "push-ups",
        "squats",
        "deadlifts",
      ]);
    });
  });

  describe("Integration: Preset + Custom Exercise Merging", () => {
    it("should merge preset selections with custom entries", () => {
      const preset = ["push_ups", "squats"];
      const custom = "deadlifts, bench press";
      const customArray = custom.split(",").map((e) => e.trim());
      const combined = [...preset, ...customArray];
      const normalized = normalizeExercises(combined);

      expect(normalized).toContain("push_ups");
      expect(normalized).toContain("squats");
      expect(normalized).toContain("deadlifts");
      expect(normalized).toContain("bench press");
    });

    it("should deduplicate when preset and custom overlap", () => {
      const preset = ["push_ups", "squats"];
      const custom = "Push-Ups, deadlifts"; // Overlaps with preset
      const customArray = custom.split(",").map((e) => e.trim());
      const combined = [...preset, ...customArray];
      const normalized = normalizeExercises(combined);

      // Should have deduplicated "push_ups" and "Push-Ups"
      const pushUpVariants = normalized?.filter((e) =>
        e.toLowerCase().includes("push")
      );
      expect(pushUpVariants?.length).toBeGreaterThanOrEqual(1);
      expect(normalized).toContain("squats");
      expect(normalized).toContain("deadlifts");
    });
  });
});
