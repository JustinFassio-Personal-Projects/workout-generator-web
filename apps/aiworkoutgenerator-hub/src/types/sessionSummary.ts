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
}

export interface SessionStatsSummary {
  totalTimeMinutes: number;
  warmupMinutes: number;
  mainMinutes: number;
  finisherMinutes: number;
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
