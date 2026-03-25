import type {
  TrainerSetDetail,
  TrainerWorkout,
  TrainerWorkoutExercise,
  TrainerWorkoutSection,
} from "@/types/firestore";

export interface SessionSetSummary extends TrainerSetDetail {
  index: number;
}

export interface SessionExerciseSummary {
  name: string;
  muscleTarget: string;
  tempo: string | null;
  setsPlanned: number;
  setsCompleted: number;
  averageRestSeconds: number | null;
  cues: string[];
  setDetails: SessionSetSummary[];
  /** Equipment needed for this exercise (for protocol recommendation when iterating). */
  equipment_needed?: string[];
}

export interface SessionSectionSummary {
  type: TrainerWorkoutSection["type"];
  durationEstimate?: string;
  exercises: SessionExerciseSummary[];
  /** User-tracked time for this section (seconds), when section timers were used. */
  actualDurationSeconds?: number | null;
  /** Computed MET for intensity reporting (see sectionIntensityMet). */
  effectiveMet?: number | null;
  intensityBand?: "low" | "moderate" | "high" | null;
}

export interface SessionStatsSummary {
  /** Display total: sum of actual section minutes when timers used, else planned workout duration. */
  totalTimeMinutes: number;
  warmupMinutes: number;
  mainMinutes: number;
  finisherMinutes: number;
  /** Sum of actual section minutes when any section has timer data (for analytics). */
  actualTotalTimeMinutes?: number | null;
  estimatedVolumeLoad: number | null;
  strainScore: number | null;
  completionPercentage: number | null;
}

export interface SessionSummaryData {
  workoutId: string;
  title: string;
  focus: string | null;
  difficulty: TrainerWorkout["difficulty"];
  completedAt: Date | null;
  trainerName: string | null;
  stats: SessionStatsSummary;
  sections: SessionSectionSummary[];
  userNotes: string | null;
}
