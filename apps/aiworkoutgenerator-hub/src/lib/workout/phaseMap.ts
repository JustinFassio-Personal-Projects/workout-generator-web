import type { TrainerWorkoutSection } from "@/types/firestore";

export type PhaseType = "warmup" | "main" | "finisher";

export interface PhaseMapEntry {
  section: TrainerWorkoutSection;
  index: number;
}

export type PhaseMap = Record<PhaseType, PhaseMapEntry | null>;

/**
 * Maps workout sections to phases (warmup, main, finisher).
 * Handles type matching, fallbacks, and default-to-main when no phase is found.
 */
export function getPhaseMap(
  sections: TrainerWorkoutSection[] | undefined
): PhaseMap {
  const map: PhaseMap = {
    warmup: null,
    main: null,
    finisher: null,
  };

  const validSections = (sections || []).filter(
    (section) =>
      section &&
      Array.isArray(section.exercises) &&
      section.exercises.length > 0
  );

  validSections.forEach((section, originalIndex) => {
    const index = sections?.indexOf(section) ?? originalIndex;
    const type = (section.type || "").toLowerCase();

    if (type.includes("warmup") || type.includes("warm")) {
      map.warmup = { section, index };
    } else if (type.includes("main") || type.includes("workout")) {
      map.main = { section, index };
    } else if (type.includes("finish") || type.includes("cool")) {
      map.finisher = { section, index };
    } else {
      if (!map.warmup && validSections.indexOf(section) === 0) {
        map.warmup = { section: { ...section, type: "Warmup" }, index };
      } else if (!map.main) {
        map.main = { section: { ...section, type: "Main Workout" }, index };
      } else if (!map.finisher) {
        map.finisher = { section: { ...section, type: "Finisher" }, index };
      }
    }
  });

  if (!map.warmup && !map.main && !map.finisher && validSections[0]) {
    map.main = {
      section: { ...validSections[0], type: "Main Workout" },
      index: 0,
    };
  }

  return map;
}
