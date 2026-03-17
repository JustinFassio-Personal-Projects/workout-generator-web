import type { Timestamp } from "firebase/firestore";
import type {
  TrainerWorkoutExercise,
  WorkoutSectionType,
  FitnessLevel,
} from "@/types/firestore";
import type { SubscriptionTier } from "@/lib/subscription-constants";

/**
 * Edit mode determines the type of modification to perform.
 */
export type EditMode =
  | "add_detail" // Add more detailed instructions
  | "update_images" // Regenerate images with specific style
  | "adjust_difficulty" // Make easier/harder
  | "modify_for_injury" // Adapt for specific injury
  | "change_intensity" // Increase/decrease intensity
  | "create_complex" // Combine multiple exercises
  | "simplify" // Break down complex movement
  | "adjust_equipment" // Change equipment requirements
  | "rewrite_cues" // Improve form cues for level
  | "coach_explain" // Generate personalized exercise breakdown
  | "custom"; // Custom user prompt

/**
 * Context information needed for AI exercise editing.
 * Extracted from workout and user profile.
 */
export interface AIEditContext {
  exercise: TrainerWorkoutExercise;
  section_type: WorkoutSectionType;
  workout_focus: string | null;
  workout_difficulty: "beginner" | "intermediate" | "advanced";
  user_fitness_level: FitnessLevel;
  user_injuries: string[];
  available_equipment: string[];
  adjacent_exercises?: string[]; // For swap mode to avoid duplicates
}

/**
 * Options for exercise editing operations.
 */
export interface AIEditOptions {
  regenerate_image: boolean;
  preserve_sets_reps: boolean; // For edits that should keep volume
  maintain_muscle_target: boolean;
}

/**
 * Request to edit an existing exercise.
 */
export interface AIEditRequest {
  mode: EditMode;
  user_prompt: string;
  context: AIEditContext;
  options: AIEditOptions;
}

/**
 * Constraints for exercise swapping.
 */
export interface AISwapConstraints {
  same_muscle_group: boolean;
  same_equipment: boolean;
  same_difficulty: boolean;
  similar_movement_pattern: boolean;
}

/**
 * Request to swap an exercise with an alternative.
 */
export interface AISwapRequest {
  reason: string; // Why swapping (injury, equipment, preference)
  constraints: AISwapConstraints;
  context: AIEditContext; // Exercise to replace and workout context
}

/**
 * Issue type for AI exercise order safety analysis.
 */
export type OrderIssueType =
  | "injury_risk"
  | "movement_conflict"
  | "muscle_fatigue"
  | "recovery_needed";

/**
 * Single issue from order check analysis.
 */
export interface OrderIssue {
  type: OrderIssueType;
  severity: "low" | "medium" | "high";
  description: string;
  affectedExercises: string[];
  recommendation?: string;
}

/**
 * Request for AI exercise order safety check.
 */
export interface AIOrderCheckRequest {
  workout_id: string;
  section_index: number;
  exercise_index: number;
}

/**
 * Response from AI exercise order safety check.
 */
export interface AIOrderCheckResponse {
  success: boolean;
  isSafe: boolean;
  riskLevel: "low" | "medium" | "high";
  issues: OrderIssue[];
  suggestedPosition?: number;
  explanation: string;
  metadata?: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
  usage?: { remaining: number | null; tier: SubscriptionTier };
}

/**
 * Base fields shared by all AI edit history entries.
 */
interface ExerciseAIEditHistoryBase {
  edit_id: string; // UUID for this edit
  user_prompt: string; // The actual user input
  applied_at: Timestamp;

  // Before state
  previous_exercise: Partial<TrainerWorkoutExercise>; // Snapshot before edit

  // AI metadata
  ai_model: string; // e.g., "gemini-2.0-flash-exp"
  generation_tokens: number;
  generation_cost_usd: number;
  genkit_trace_id: string | null;

  // Changes applied
  fields_modified: string[]; // e.g., ["detailedInstructions", "cues", "image_url"]

  // User feedback (optional)
  user_rating: number | null; // 1-5 stars
  user_feedback: string | null;
}

/**
 * AI edit history entry for exercise edit operations.
 */
export interface ExerciseAIEditHistoryEntry extends ExerciseAIEditHistoryBase {
  edit_type: "ai_edit";
  edit_mode: EditMode; // Required for edit operations
}

/**
 * AI edit history entry for exercise swap operations.
 */
export interface ExerciseAISwapHistoryEntry extends ExerciseAIEditHistoryBase {
  edit_type: "ai_swap";
  // edit_mode is not applicable for swap operations (swaps don't have edit modes)
}

/**
 * AI edit history entry for exercise add operations.
 * previous_exercise is empty when adding (no existing exercise at insert position).
 */
export interface ExerciseAIAddHistoryEntry extends ExerciseAIEditHistoryBase {
  edit_type: "ai_add";
}

/**
 * AI edit history entry stored on exercise document.
 * Uses discriminated union to ensure type safety: edit_mode is only required for "ai_edit" type.
 */
export type ExerciseAIEditHistory =
  | ExerciseAIEditHistoryEntry
  | ExerciseAISwapHistoryEntry
  | ExerciseAIAddHistoryEntry;

/**
 * Response from AI edit operation.
 */
export interface AIEditResponse {
  success: boolean;
  modified_exercise: TrainerWorkoutExercise;
  explanation: string; // What was changed and why (2-3 sentences)
  fields_modified: string[];
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
  usage: {
    remaining: number | null;
    tier: SubscriptionTier;
  };
}

/**
 * Swap suggestion from AI.
 */
export interface AISwapSuggestion {
  rank: number; // 1 = best match
  exercise: TrainerWorkoutExercise;
  explanation: string; // Why it's a good swap (2-3 sentences)
  match_score: number; // 0-100
}

/**
 * Response from AI swap operation.
 */
export interface AISwapResponse {
  success: boolean;
  suggestions: AISwapSuggestion[];
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
  usage: {
    remaining: number | null;
    tier: SubscriptionTier;
  };
}

/**
 * Request for AI add exercise operation.
 * Same options as swap; context uses reference_exercise (position context).
 */
export interface AIAddRequest {
  reason: string;
  constraints: AISwapConstraints;
  context: {
    reference_exercise: TrainerWorkoutExercise;
    section_type: WorkoutSectionType;
    workout_focus: string | null;
    workout_difficulty: "beginner" | "intermediate" | "advanced";
    user_fitness_level: FitnessLevel;
    user_injuries: string[];
    available_equipment: string[];
    adjacent_exercises?: string[];
  };
}

/**
 * Response from AI add exercise operation.
 * Same structure as swap (suggestions array).
 */
export interface AIAddResponse {
  success: boolean;
  suggestions: AISwapSuggestion[];
  metadata: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
  };
  usage: {
    remaining: number | null;
    tier: SubscriptionTier;
  };
}

/**
 * Response from Coach Explain operation.
 */
export interface CoachExplainResponse {
  exerciseGuide: string;
  anatomyBreakdown: string;
  theWhy: string;
  detailedInstructions: string;
  metadata?: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
    genkit_trace_id: string | null;
    biomechanical_data_available: boolean;
  };
  usage?: {
    remaining: number | null;
    tier: SubscriptionTier;
  };
}

// ============================================
// AI Interval Timer Types
// ============================================

/**
 * Intensity level presets for interval timer.
 */
export type IntervalIntensityLevel = "easy" | "moderate" | "intense";

/**
 * Timer phase during interval workout.
 */
export type IntervalTimerPhase =
  | "idle"
  | "setup"
  | "active"
  | "switching"
  | "rest";

/**
 * Request for AI interval timer recommendations.
 */
export interface AIIntervalTimerRequest {
  exerciseName: string;
  exerciseData: {
    sets: number;
    setDetails?: Array<{
      reps: string;
      weight: string;
      duration?: string;
      rest: string;
      notes?: string;
    }>;
    tempo?: string | null;
    muscleTarget: string;
  };
  userLevel: FitnessLevel;
  intensityPreference?: IntervalIntensityLevel | "custom";
}

/**
 * Response from AI interval timer with recommended timings.
 */
export interface AIIntervalTimerResponse {
  workDuration: number; // seconds
  restDuration: number; // seconds
  setupDuration: number; // seconds (default 5)
  isBilateral: boolean;
  switchIndicator?: string; // e.g., "Switch legs"
  explanation: string;
  intensityLevel: IntervalIntensityLevel;
  metadata?: {
    ai_model: string;
    generation_tokens: number;
    generation_cost_usd: number;
  };
  usage?: {
    remaining: number | null;
    tier: SubscriptionTier;
  };
}

/**
 * Timer configuration stored in component state (legacy single-exercise).
 */
export interface IntervalTimerConfig {
  workDuration: number;
  restDuration: number;
  setupDuration: number;
  isBilateral: boolean;
  switchIndicator?: string;
  currentSet: number;
  totalSets: number;
}

// ============================================
// Section-Based Timer Types
// ============================================

/**
 * Timer mode determines how exercises and sets are progressed.
 * - "interval": All sets of exercise 1, then all sets of exercise 2, etc. Countdown timer, timed rest.
 * - "circuit": 1 set per exercise per round, repeat. Stopwatch (count UP), manual rest.
 * - "interval-circuit": Countdown timer, timed rest, but circuit progression (round 1 = set 1 of each, etc.)
 */
export type TimerMode = "interval" | "circuit" | "interval-circuit";

/**
 * Timer configuration for a single exercise within a section.
 */
export interface ExerciseTimerConfig {
  exerciseIndex: number;
  exerciseName: string;
  workDuration: number; // seconds per set (or per side/direction for bilateral/bidirectional)
  restDuration: number; // seconds between exercises (not between sets)
  sets: number;
  isBilateral: boolean;
  isBidirectional?: boolean;
  switchIndicator?: string; // For bilateral exercises
  directionIndicator?: string; // For bidirectional exercises
  transitionMode?: "rest" | "active"; // "rest" = countdown rest between exercises, "active" = immediate transition (for warm-ups)
}

/**
 * Timer configuration for an entire workout section (Warmup, Main, Finisher).
 */
export interface SectionTimerConfig {
  sectionIndex: number;
  sectionType: string; // e.g., "Warmup", "Main Workout", "Finisher"
  exercises: ExerciseTimerConfig[];
  setupDuration: number; // seconds before section starts (default 5)
  cooldownDuration?: number; // seconds after section completes (default 60)
  transitionDuration?: number; // Deprecated: no longer used between exercises, kept for backward compatibility
  timerMode?: TimerMode; // Timer mode for this section (default: "interval-circuit")
  completed?: boolean;
  completedAt?: string; // ISO timestamp
}

/**
 * All section timer configs for a workout, keyed by section index.
 */
export interface WorkoutTimerConfigs {
  [sectionIndex: number]: SectionTimerConfig;
}

/**
 * Current state of section timer playback.
 */
export interface SectionTimerState {
  phase: IntervalTimerPhase | "transition" | "section-complete";
  currentSectionIndex: number;
  currentExerciseIndex: number;
  currentSet: number;
  bilateralSide: 1 | 2; // For bilateral exercises
}
