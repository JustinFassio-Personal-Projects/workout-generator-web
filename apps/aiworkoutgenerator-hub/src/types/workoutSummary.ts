import type { Timestamp } from "firebase/firestore";
import type {
  SessionSectionSummary,
  SessionStatsSummary,
} from "@/types/sessionSummary";
import type { WeightSelection } from "@/types/autoregulation";

/**
 * Firestore document type for workout_summaries collection
 * This represents a persisted session report snapshot
 */
export interface WorkoutSummary {
  id: string; // Document ID
  user_id: string; // User who completed the workout
  workout_id: string; // Reference to trainer_workouts document

  // Summary metadata
  title: string;
  focus: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  completed_at: Timestamp; // When workout was completed
  trainer_name: string | null;

  // Statistics
  stats: SessionStatsSummary;

  // Sections and exercises (full summary data)
  sections: SessionSectionSummary[];

  // User feedback
  user_notes: string | null;
  difficulty_rating: number | null; // 1-10
  enjoyment_rating: number | null; // 1-10

  // Autoregulation (completion metadata for iterate-from / generation)
  session_rpe?: number | null;
  weight_selection?: WeightSelection | null;
  session_feedback?: string[];
  joint_pain_location?: string | null;

  // Public sharing
  visibility?: "private" | "public"; // Default to 'private'
  published_at?: Timestamp; // When the summary was made public
  public_slug?: string; // Optional friendly URL slug for future use

  // Timestamps
  created_at: Timestamp; // When summary was created
  updated_at: Timestamp;
}

/**
 * Analytics calculated from workout summaries
 */
export interface SummaryAnalytics {
  totalSummaries: number;
  totalTimeMinutes: number;
  averageStrainScore: number | null;
  averageCompletionPercentage: number | null;
  mostCommonFocus: string | null;
  mostCommonDifficulty: "beginner" | "intermediate" | "advanced" | null;
  summariesThisWeek: number;
  summariesThisMonth: number;
}
