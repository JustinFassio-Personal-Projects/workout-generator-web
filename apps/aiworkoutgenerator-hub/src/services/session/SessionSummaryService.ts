import type {
  TrainerWorkout,
  TrainerWorkoutExercise,
  TrainerWorkoutSection,
} from "@/types/firestore";
import type {
  SessionExerciseSummary,
  SessionSectionSummary,
  SessionSetSummary,
  SessionStatsSummary,
  SessionSummaryData,
} from "@/types/sessionSummary";

function getCompletedSets(exercise: TrainerWorkoutExercise): number {
  return exercise.setDetails?.filter((set) => set.completed)?.length ?? 0;
}

function parseRestToSeconds(rest?: string): number | null {
  if (!rest) return null;
  const trimmed = rest.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)\s*(s|sec|secs|seconds)$/);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  if (Number.isNaN(value)) return null;
  return value;
}

function buildExerciseSummary(
  exercise: TrainerWorkoutExercise
): SessionExerciseSummary {
  const setDetails: SessionSetSummary[] =
    exercise.setDetails?.map((set, idx) => ({
      ...set,
      index: idx + 1,
    })) ?? [];

  const restValues: number[] = [];
  for (const set of exercise.setDetails ?? []) {
    const restSeconds =
      parseRestToSeconds(set.duration) ?? parseRestToSeconds(set.rest);
    if (restSeconds != null) {
      restValues.push(restSeconds);
    }
  }

  const averageRestSeconds =
    restValues.length > 0
      ? Math.round(
          restValues.reduce((sum, v) => sum + v, 0) / restValues.length
        )
      : null;

  return {
    name: exercise.name,
    muscleTarget: exercise.muscleTarget,
    tempo: exercise.tempo,
    setsPlanned: exercise.sets,
    setsCompleted: getCompletedSets(exercise),
    averageRestSeconds,
    cues: exercise.cues ?? [],
    setDetails,
    equipment_needed: exercise.equipment_needed ?? [],
  };
}

function buildSectionSummary(
  section: TrainerWorkoutSection
): SessionSectionSummary {
  return {
    type: section.type,
    durationEstimate: section.durationEstimate,
    exercises:
      section.exercises?.map((exercise) =>
        buildExerciseSummary(exercise as TrainerWorkoutExercise)
      ) ?? [],
  };
}

function buildStatsSummary(workout: TrainerWorkout): SessionStatsSummary {
  const totalTimeMinutes = workout.totalDuration || workout.duration_minutes;

  let warmupMinutes = 0;
  let mainMinutes = 0;
  let finisherMinutes = 0;

  for (const section of workout.sections ?? []) {
    const durationEstimate = section.durationEstimate;
    if (!durationEstimate) continue;

    const minutesMatch = durationEstimate.match(/(\d+)\s*min/);
    const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;

    if (section.type === "Warmup") {
      warmupMinutes += minutes;
    } else if (section.type === "Finisher") {
      finisherMinutes += minutes;
    } else {
      mainMinutes += minutes;
    }
  }

  // Placeholder volume load & strain score – can be refined later
  const estimatedVolumeLoad = null;
  const strainScore = workout.difficulty_rating ?? null;

  return {
    totalTimeMinutes,
    warmupMinutes,
    mainMinutes,
    finisherMinutes,
    estimatedVolumeLoad,
    strainScore,
    completionPercentage: workout.completion_percentage ?? null,
  };
}

export class SessionSummaryService {
  /**
   * Safely convert completed_at to Date, handling both Timestamp and Date objects
   */
  private static convertCompletedAtToDate(completedAt: unknown): Date | null {
    if (!completedAt) return null;

    // If it's already a Date object
    if (completedAt instanceof Date) {
      return completedAt;
    }

    // If it's a Firestore Timestamp with toDate method
    if (
      typeof completedAt === "object" &&
      completedAt !== null &&
      "toDate" in completedAt &&
      typeof (completedAt as { toDate: () => Date }).toDate === "function"
    ) {
      return (completedAt as { toDate: () => Date }).toDate();
    }

    // If it has seconds property (Firestore Timestamp serialized)
    if (
      typeof completedAt === "object" &&
      completedAt !== null &&
      "seconds" in completedAt &&
      typeof (completedAt as { seconds: number }).seconds === "number"
    ) {
      return new Date((completedAt as { seconds: number }).seconds * 1000);
    }

    // Fallback: try to construct Date from the value if it's a valid input
    if (typeof completedAt === "string" || typeof completedAt === "number") {
      try {
        return new Date(completedAt);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Generate a session report snapshot from a completed workout.
   * This is a pure, synchronous transform of a TrainerWorkout document.
   */
  static generateSessionSummary(workout: TrainerWorkout): SessionSummaryData {
    const sections: SessionSectionSummary[] =
      workout.sections?.map((section) =>
        buildSectionSummary(section as TrainerWorkoutSection)
      ) ?? [];

    const stats = buildStatsSummary(workout);

    return {
      workoutId: workout.id,
      title: workout.title,
      focus: workout.focus,
      difficulty: workout.difficulty,
      completedAt: this.convertCompletedAtToDate(workout.completed_at),
      trainerName: workout.trainerName,
      stats,
      sections,
      userNotes: workout.user_notes ?? null,
    };
  }
}
