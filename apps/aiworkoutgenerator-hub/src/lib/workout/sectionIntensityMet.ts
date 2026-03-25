import type { TrainerWorkout, TrainerWorkoutSection } from "@/types/firestore";

export type IntensityBand = "low" | "moderate" | "high";

const MET_COOLDOWN = 2.5;
const MET_WARMUP = 3.5;
const MET_FINISHER = 9.5;

const MET_BY_DIFFICULTY = {
  beginner: 5.5,
  intermediate: 7,
  advanced: 8.5,
} as const;

/**
 * Effective MET for a workout section from section type and workout difficulty.
 * Cooldown is distinguished from Finisher (both may share a phase tab in the player).
 */
export function getEffectiveMetForSection(
  section: TrainerWorkoutSection,
  workout: TrainerWorkout
): number {
  const t = (section.type || "").toLowerCase();

  if (t.includes("cool")) {
    return MET_COOLDOWN;
  }
  if (t.includes("warm")) {
    return MET_WARMUP;
  }
  if (t.includes("finish")) {
    return MET_FINISHER;
  }

  const d = workout.difficulty;
  return MET_BY_DIFFICULTY[d] ?? MET_BY_DIFFICULTY.intermediate;
}

export function intensityBandFromMet(met: number): IntensityBand {
  if (met < 4) return "low";
  if (met < 7.5) return "moderate";
  return "high";
}

/** Aggregate actual seconds into warmup / main / finisher minute buckets (matches legacy estimate grouping). */
export function bucketActualSectionMinutes(
  sections: TrainerWorkoutSection[] | undefined,
  sectionActualSeconds: Record<number, number>
): { warmupMinutes: number; mainMinutes: number; finisherMinutes: number } {
  let warmupMinutes = 0;
  let mainMinutes = 0;
  let finisherMinutes = 0;

  (sections ?? []).forEach((section, index) => {
    const sec = sectionActualSeconds[index];
    if (sec == null || sec <= 0) return;
    const mins = sec / 60;

    if (section.type === "Warmup") {
      warmupMinutes += mins;
    } else if (section.type === "Finisher") {
      finisherMinutes += mins;
    } else {
      mainMinutes += mins;
    }
  });

  return { warmupMinutes, mainMinutes, finisherMinutes };
}
