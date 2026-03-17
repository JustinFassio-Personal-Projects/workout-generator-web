import type { Timestamp } from "firebase/firestore";

// Import ExerciseAIEditHistory for TrainerWorkoutExercise type
// Using type-only import to avoid circular dependency issues
import type { ExerciseAIEditHistory } from "@/types/ai-exercise-editor";
import type { WeightSelection } from "@/types/autoregulation";
import type { OverloadProtocol } from "@/types/overloadProtocol";

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "athlete";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extremely_active";

export type EquipmentAccess = "none" | "minimal" | "home" | "full_gym";

export interface PreferredUnits {
  weight: "lb" | "kg";
  height: "in" | "cm";
  distance: "mi" | "km";
  temperature: "f" | "c";
}

export interface MacroTargets {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

export type WorkoutMusicPreference = "upbeat" | "calm" | "none";

export type WorkoutIntensityPreference =
  | "low"
  | "moderate"
  | "high"
  | "variable";

// -----------------------------
// Reference collections (schema)
// -----------------------------

export interface WorkoutFocus {
  id: string; // doc id
  name: string;
  description: string;
  icon: string;
  color: string;
  typical_duration: number[];
  difficulty_levels: Array<"beginner" | "intermediate" | "advanced">;
  equipment_required: boolean;
  is_active: boolean;
  display_order: number;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface EquipmentItem {
  id: string; // doc id
  name: string;
  display_order: number;
  categories?: string[]; // Array of category tags (e.g., ["strength", "general"])
  primary_category?: string; // Main category (e.g., "Free Weights", "Cardio")
  sub_category?: string; // Sub-category (e.g., "Olympic Barbell", "Adjustable")
  description?: string; // Optional description
  // Existing fields:
  category: "weights" | "cardio" | "bodyweight" | "accessories" | string;
  icon: string | null;
  requires_gym: boolean;
  typical_for_home: boolean;
  can_adjust_weight: boolean;
  weight_range_kg: { min: number | null; max: number | null } | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface TrainerEquipmentSet {
  focus_id: string; // Focus ID (document ID in subcollection)
  focus_name: string; // Display name (e.g., "Strength Training")
  equipment_ids: string[]; // Array of equipment_item IDs
}

// -----------------------------
// AI Prompts (Admin-managed)
// -----------------------------

export type AiPromptType =
  | "system"
  | "template"
  | "injection"
  | "section"
  | "board"
  | "coach_explain"
  | "image_generator"
  | "workout_generation"
  | "edit_exercise"
  | "swap_exercise";

export type AiPromptCategory =
  | "exercise_editor"
  | "section_editor"
  | "board_editor"
  | "image_generator"
  | "workout_generation"
  | "coach_explain"
  | "general";

export interface AiPrompt {
  id: string; // doc id
  name: string;
  type: AiPromptType;
  category: AiPromptCategory;
  content: string;
  variables?: string[];
  // Versioning
  version: number;
  is_active: boolean;
  previous_version_id?: string;
  // Metadata
  description?: string;
  usage_count?: number;
  last_used_at?: Timestamp;
  // Relationships
  trainer_ids?: string[];
  // Audit
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;
}

export interface PromptSet {
  id: string; // doc id
  name: string;
  description?: string;
  // Prompt references
  system_prompt_id?: string;
  workout_generation_prompt_id?: string;
  edit_exercise_prompt_id?: string;
  swap_exercise_prompt_id?: string;
  coach_explain_prompt_id?: string;
  exercise_editor_prompt_id?: string;
  section_editor_prompt_id?: string;
  board_editor_prompt_id?: string;
  image_generator_prompt_id?: string;
  // Prompt injections (applied in order)
  injection_ids?: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type PromptInjectionType = "prepend" | "append" | "replace_section";

export interface PromptInjectionConditions {
  fitness_level?: string[];
  has_injuries?: boolean;
  equipment_access?: string[];
}

export interface PromptInjection {
  id: string; // doc id
  name: string;
  type: PromptInjectionType;
  target_section?: string;
  content: string;
  variables?: string[];
  conditions?: PromptInjectionConditions;
  priority: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PromptMetadata {
  prompt_set_id?: string | null;
  prompt_ids?: string[];
  prompt_versions?: Record<string, number>;
  injection_ids?: string[];
  resolved_at?: Timestamp | Date;
}

// -----------------------------
// Phase 1 profile (core fields)
// -----------------------------

export interface UserProfile {
  id: string; // uid (doc id)
  user_id: string; // redundant but query-friendly

  // Basic info
  first_name: string;
  last_name: string;
  display_name: string;

  // Body stats
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  preferred_units: PreferredUnits;

  // Fitness
  fitness_level: FitnessLevel;
  current_activity_level: ActivityLevel;
  fitness_goals: string[];

  // Safety
  injuries: string[];
  injury_details: string | null;
  medical_conditions: string[];
  medical_notes: string | null;

  // Equipment
  equipment_access: string[]; // Changed from EquipmentAccess enum to string[] (category strings)
  available_equipment: string[]; // equipment_items ids

  // Phase 2: Enhanced Data
  preferred_workout_duration: number | null;
  workout_frequency_per_week: number | null;
  preferred_workout_times: string[] | null;
  preferred_rest_between_sets: number | null;
  training_experience_years: number | null;
  sports_background: string[] | null;
  previous_training_programs: string[] | null;
  favorite_exercises: string[] | null;
  disliked_exercises: string[] | null;
  exercise_restrictions: string[] | null;
  current_bench_press_max: number | null;
  current_squat_max: number | null;
  current_deadlift_max: number | null;
  current_overhead_press_max: number | null;
  current_mile_time: number | null;
  current_5k_time: number | null;
  resting_heart_rate: number | null;
  target_weight: number | null;
  target_body_fat_percentage: number | null;
  current_body_fat_percentage: number | null;
  workout_music_preference: WorkoutMusicPreference | null;
  workout_intensity_preference: WorkoutIntensityPreference | null;
  prefers_group_workouts: boolean | null;
  prefers_outdoor_workouts: boolean | null;
  dietary_restrictions: string[] | null;
  food_allergies: string[] | null;
  daily_calorie_target: number | null;
  macro_targets: MacroTargets | null;

  // AI Coach
  selected_ai_coach: string | null; // AI coach ID (trainer ID from trainers collection, e.g., "marcus_chen", "rivera_santos")

  // Metadata
  onboarding_completed: boolean;
  onboarding_completed_at: Timestamp | null;
  profile_completeness: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_workout_generated_at: Timestamp | null;
}

// -----------------------------
// Phase 3: Daily state (context)
// -----------------------------

export interface SorenessArea {
  area: string;
  level: number; // 1-10
}

export interface MuscleGroupFocus {
  area: string;
  percentage: number; // 0-100
  locked: boolean; // true if manually adjusted by user
}

export type LocationType =
  | "home"
  | "gym"
  | "outdoor"
  | "hotel"
  | "office"
  | "other";

export type TimeOfDay =
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "night";

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export type DataSource = "manual" | "wearable" | "hybrid";

export interface UserDailyState {
  id: string; // `${user_id}_${YYYY-MM-DD}`
  user_id: string;
  date: string; // YYYY-MM-DD

  // Daily metrics
  energy_level: number; // 1-10
  sleep_quality: number; // 1-10
  sleep_hours: number | null;
  stress_level: number; // 1-10
  motivation_level: number; // 1-10

  // Soreness
  soreness_areas: SorenessArea[];
  overall_soreness: number; // average of soreness_areas.level

  // Muscle Group Focus (workout target distribution)
  muscle_group_focus?: MuscleGroupFocus[];

  // Context
  current_location: LocationType;
  available_time: number | null; // minutes
  time_of_day: TimeOfDay;
  weather_condition: string | null;
  temperature: number | null;

  // Women's health (optional)
  cycle_phase: CyclePhase | null;
  cycle_symptoms: string[] | null;

  // Activity context
  days_since_last_workout: number | null;
  workouts_this_week: number;
  consecutive_workout_days: number;

  // Metadata
  data_source: DataSource;
  wearable_connection_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  saved_at_datetime: string; // ISO 8601 datetime string (YYYY-MM-DDTHH:mm:ss.sssZ)
  workout_id: string | null;
  workout_generated_at: Timestamp | null;
}

// -----------------------------
// Trainer: Workouts (schema-aligned)
// -----------------------------

export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";

// -----------------------------
// Certification Types
// -----------------------------

/**
 * Status of a workout's certification process.
 */
export type CertificationStatus =
  | "none" // Not submitted for certification
  | "pending" // Submitted, awaiting trainer assignment
  | "in_review" // Assigned to trainer, being reviewed
  | "changes_requested" // Trainer requested changes from user
  | "certified" // Approved by trainer
  | "rejected"; // Denied by trainer

/**
 * Questionnaire filled by user when submitting workout for certification.
 * Focuses on AI validation - helping trainers understand user hesitations
 * with AI-generated content rather than collecting redundant profile data.
 */
export interface CertificationQuestionnaire {
  // Step 1: Gut Check - Primary hesitation with AI draft
  primary_hesitation: string;
  ai_hallucination_report: string;

  // Step 2: Logic & Logistics Audit
  logic_errors: string[];
  pacing_assessment: string;

  // Step 3: Image Certification - Visual quality flags
  visual_flags: string[];
  visual_correction_request?: string;
}

export type WorkoutSectionType =
  | "Warmup"
  | "Main Workout"
  | "Cooldown"
  | "Finisher";

/**
 * Individual set tracking for an exercise.
 * Stores both AI-suggested values and user-logged actual values.
 */
export interface TrainerSetDetail {
  reps: string; // e.g., "12" or "AMRAP"
  weight: string; // Suggested intensity e.g., "RPE 8" or "Heavy"
  actualWeight?: string; // User-logged actual weight
  duration?: string; // Time if applicable, e.g., "45s"
  rest: string; // Rest after set, e.g., "60s"
  notes?: string; // Set-specific notes
  isUserAdded?: boolean; // True if user added this set manually
  completed?: boolean; // Whether this individual set has been completed
}

/**
 * Enhanced exercise with technique details and set tracking.
 *
 * Note: Some fields use snake_case (equipment_needed, muscle_groups) for
 * backwards compatibility with existing Firestore documents. New fields
 * use camelCase following TypeScript conventions.
 */
export interface TrainerWorkoutExercise {
  name: string;
  sets: number;
  muscleTarget: string; // Primary muscle target, e.g., "Chest"
  tempo: string | null; // e.g., "3-0-1-0" or null
  cues: string[]; // Technique cues for proper form
  detailedInstructions: string | null; // Step-by-step instructions
  setDetails: TrainerSetDetail[]; // Individual set data
  equipment_needed: string[]; // Legacy snake_case for Firestore compatibility
  muscle_groups: string[]; // Legacy snake_case for Firestore compatibility

  // Image generation fields
  image_url?: string; // Firebase Storage URL for exercise demonstration image
  image_source?: "generated" | "master"; // Whether image was newly generated or from master library
  image_generated_at?: Timestamp; // When the image was generated

  // Exercise completion tracking
  completed?: boolean; // Whether this exercise has been marked as completed

  // AI exercise editor fields (Phase 6)
  // Note: These fields are optional and only present when exercises have been edited
  ai_edit_history?: ExerciseAIEditHistory[]; // History of AI edits/swaps applied to this exercise
  ai_coach_explain?: string | null; // Coach Explain content (markdown formatted) - separate from detailedInstructions
}

/**
 * Timer configuration for a single exercise within a section (persisted).
 */
export interface ExerciseTimerConfigPersisted {
  exerciseIndex: number;
  workDuration: number; // seconds per set (or per side/direction for bilateral/bidirectional)
  restDuration: number; // seconds between exercises
  sets: number;
  isBilateral: boolean;
  isBidirectional?: boolean;
  switchIndicator?: string; // For bilateral exercises
  directionIndicator?: string; // For bidirectional exercises
}

/**
 * Timer configuration for a workout section (persisted in Firestore).
 */
export interface SectionTimerConfigPersisted {
  exercises: ExerciseTimerConfigPersisted[];
  setupDuration: number; // seconds before section starts
  cooldownDuration?: number; // seconds after section completes (default 60)
  transitionDuration?: number; // Deprecated: no longer used between exercises, kept for backward compatibility
  timerMode?: "interval" | "circuit" | "interval-circuit"; // Timer mode for this section
  completed?: boolean;
  completedAt?: Timestamp;
}

/**
 * Workout section grouping exercises by phase.
 */
export interface TrainerWorkoutSection {
  type: WorkoutSectionType;
  durationEstimate: string; // e.g., "10 mins"
  exercises: TrainerWorkoutExercise[];
  // Optional timer configuration (persisted when user configures interval timer)
  timer_config?: SectionTimerConfigPersisted;
}

/**
 * Personalization insight explaining how workout was adapted.
 */
export interface PersonalizationItem {
  attribute: string; // e.g., "Low Energy (4/10)", "Knee Injury"
  adjustment: string; // e.g., "Reduced volume by 20%", "Avoided squats"
}

export interface TrainerWorkoutGenerationContext {
  profile_snapshot: {
    fitness_level: string;
    injuries: string[];
    equipment_access: string[]; // Changed from string to string[] categories
    available_equipment: string[]; // Added to support QA equipment matching
  };
  daily_state_snapshot: {
    energy_level: number;
    sleep_quality: number;
    stress_level: number;
    soreness_areas: SorenessArea[];
    muscle_group_focus?: MuscleGroupFocus[];
  } | null;
  used_profile_data: boolean;
  used_daily_state: boolean;
  equipment_override: boolean;
}

export interface TrainerWorkout {
  id: string; // doc id
  user_id: string;

  // Trainer context
  trainerId: string | null; // AI trainer persona used for generation
  trainerName: string | null; // Trainer display name for UI

  // Workout metadata
  title: string;
  description: string; // Brief overview of the workout
  focus: string | null; // Specific focus or null for blend mode
  duration_minutes: number; // User-requested target duration (input constraint)
  difficulty: WorkoutDifficulty;

  // Enhanced fields
  trainerNotes: string; // Motivational quote or advice
  totalDuration: number; // AI-estimated actual duration based on exercises (may differ from requested)
  estimatedCalories: number; // Estimated calories burned

  // Sections (replaces flat exercises array)
  sections: TrainerWorkoutSection[];

  // Personalization insights
  personalization: PersonalizationItem[];

  // Generation context
  generation_context: TrainerWorkoutGenerationContext;

  // AI metadata
  generated_by: "genkit" | "openai" | "anthropic";
  genkit_trace_id: string | null;
  ai_model: string | null;
  generation_tokens: number | null;
  generation_cost_usd: number | null;
  prompt_metadata?: PromptMetadata;

  // Workout status
  completed: boolean;
  completed_at: Timestamp | null;
  scheduled_for: Timestamp | null;

  // User feedback
  difficulty_rating: number | null;
  enjoyment_rating: number | null;
  completion_percentage: number | null;
  user_notes: string | null;

  // Autoregulation (completion metadata for iterate-from / generation)
  session_rpe?: number | null; // 1–10 sRPE
  weight_selection?: WeightSelection | null;
  session_feedback?: string[]; // ran_out_of_time, joint_tendon_pain, etc.
  joint_pain_location?: string | null;

  // Image generation
  has_images?: boolean; // Whether images were generated for this workout
  images_generated_at?: Timestamp; // When images were generated

  // Quality Assurance (populated during/after generation for admin monitoring)
  quality_assurance?: TrainerWorkoutQualityAssurance;

  // Certification (trainer review process)
  certification_status?: CertificationStatus;
  certification_requested_at?: Timestamp;
  certification_questionnaire?: CertificationQuestionnaire;
  assigned_trainer_id?: string; // Trainer assigned to review
  assigned_trainer_name?: string; // Trainer display name
  assigned_at?: Timestamp;
  certified_by_trainer_id?: string; // Trainer who certified
  certified_at?: Timestamp;
  certification_notes?: string; // Trainer's notes/feedback
  certified_version_id?: string; // Reference to certified workout copy

  // Public sharing
  visibility?: "private" | "public"; // Default to 'private'
  published_at?: Timestamp; // When the workout was made public
  public_slug?: string; // Optional friendly URL slug for future use

  // Iteration metadata (if this workout was generated via iteration mode)
  iteration_source_summary_id?: string; // ID of the WorkoutSummary this was iterated from
  iteration_overload_protocol?: OverloadProtocol;
  /** Full lineage metadata for iteration chains (Day N, same program). */
  iteration_metadata?: IterationMetadata;

  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Metadata for a workout that was generated by iterating from a previous session.
 * Tracks the chain so we can show "Day N" and "Continue this program".
 */
export interface IterationMetadata {
  iteration_number: number;
  source_summary_id: string;
  protocol_used: OverloadProtocol;
  lineage_id: string;
  lineage_started_at: Timestamp;
}

// -----------------------------
// Master Exercise Images (Admin-curated)
// -----------------------------

/**
 * Master exercise image stored in master_exercise_images collection.
 * These are admin-certified images that get reused for matching exercises.
 * Documents use random IDs (not normalized exercise names).
 *
 * NOTE: Old schema fields (quality_score, marked_master_at, etc.) are kept as optional
 * for backward compatibility with legacy admin code that may still exist in the Hub repo.
 */
export interface MasterExerciseImage {
  id: string; // Document ID (random, not normalized name)
  exercise_name: string; // Exact exercise name (for query matching, trimmed only)
  image_url: string; // Firebase Storage download URL (signed URL or storage://path format)
  storage_path: string; // Path in Firebase Storage: exercises/{normalizedName}/{timestamp}-{randomId}.{ext}
  position?: number; // 1-12 (1 = primary, 2-12 = secondary/tertiary/etc.) - new schema
  status?: "pending_certification" | "certified" | "rejected"; // Only show 'certified' to Hub users - new schema
  certified_by?: string; // Admin user ID who certified the image - new schema
  certified_at?: Timestamp; // When the image was certified - new schema
  file_size_bytes?: number; // File size in bytes
  dimensions?: { width: number; height: number }; // Image dimensions
  mime_type?: string; // MIME type (e.g., "image/jpeg")
  created_at: Timestamp; // When the image was created
  updated_at: Timestamp; // Last update timestamp
  // Legacy schema fields (for backward compatibility with admin code)
  quality_score?: number | null; // Legacy: Admin rating 1-5
  rated_by?: string; // Legacy: Admin user ID who set the quality score
  marked_master_at?: Timestamp; // Legacy: When admin marked as master
  marked_by?: string; // Legacy: Admin user ID who marked as master
  prompt_used?: string; // Legacy: The prompt that generated this image
}

/**
 * Exercise image status type.
 */
export type ExerciseImageStatus =
  | "pending_certification"
  | "certified"
  | "rejected";

// -----------------------------
// Image Generation Configuration
// -----------------------------

/**
 * App-wide image generation configuration stored in app_config/image_generation.
 * Allows admins to adjust prompts without code changes.
 */
export interface ImageGenerationConfig {
  base_prompt_template: string;
  style_modifiers: string[];
  negative_prompts: string[];
  model_version: string;
  last_updated: Timestamp;
  updated_by: string;
}

// -----------------------------
// User Subscription (Image Usage Tracking)
// -----------------------------

/**
 * User subscription data with image usage tracking.
 * Stored in user_subscriptions/{userId} or as part of user document.
 */
export interface UserImageUsage {
  workouts_with_images_count: number; // Number of workouts with generated images
  last_image_generated_at: Timestamp | null;
}

// -----------------------------
// User Exercise Image Preferences
// -----------------------------

/**
 * User-specific exercise image preference.
 * Allows users to override the default exact-match image mapping with a custom selection.
 * Stored in user_exercise_image_preferences collection.
 * Document ID format: `${userId}_${normalizedExerciseName}`
 */
export interface UserExerciseImagePreference {
  id: string; // Document ID: `${userId}_${normalizedExerciseName}`
  userId: string; // Firebase Auth UID
  exerciseName: string; // Normalized exercise name (trimmed)
  selectedImageUrl: string; // Selected image URL from master_exercise_images
  selectedImageId: string; // Document ID from master_exercise_images collection
  created_at: Timestamp; // When preference was created
  updated_at: Timestamp; // Last update timestamp
}

// -----------------------------
// Workout Quality Assurance (QA)
// -----------------------------

/**
 * Generic timestamp interface compatible with both Client SDK and Admin SDK.
 * Used for QA types which are computed server-side but read client-side.
 */
export interface QATimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

/**
 * Alert codes for workout quality issues.
 * Used for type-safe alert generation and filtering.
 */
export const QA_ALERT_CODES = {
  // Critical - Workout unusable
  NO_EXERCISES: "NO_EXERCISES",
  EXERCISES_MISSING_FIELD: "EXERCISES_MISSING_FIELD",
  GENERATION_FAILED: "GENERATION_FAILED",
  NO_MAIN_WORKOUT: "NO_MAIN_WORKOUT",
  IMAGE_GEN_FAILED: "IMAGE_GEN_FAILED",

  // Warning - Quality issues
  GENERATION_PARTIAL: "GENERATION_PARTIAL",
  IMAGE_GEN_PARTIAL: "IMAGE_GEN_PARTIAL",
  NO_INSTRUCTIONS: "NO_INSTRUCTIONS",
  NO_FORM_CUES: "NO_FORM_CUES",
  NO_WARMUP: "NO_WARMUP",
  WARMUP_INSUFFICIENT_EXERCISES: "WARMUP_INSUFFICIENT_EXERCISES",
  WARMUP_MISSING_LOWER_BACK: "WARMUP_MISSING_LOWER_BACK",
  WARMUP_MISSING_FOCUS_MUSCLES: "WARMUP_MISSING_FOCUS_MUSCLES",
  NO_COOLDOWN: "NO_COOLDOWN",
  EQUIPMENT_MISMATCH: "EQUIPMENT_MISMATCH",
  DIFFICULTY_MISMATCH: "DIFFICULTY_MISMATCH",
  POTENTIAL_INJURY_CONFLICT: "POTENTIAL_INJURY_CONFLICT",
  DURATION_INACCURATE: "DURATION_INACCURATE",
  LOW_VARIETY: "LOW_VARIETY",
  MISSING_TITLE: "MISSING_TITLE",
  GENERIC_TITLE: "GENERIC_TITLE",

  // Info - Minor issues
  IMAGE_GEN_PENDING: "IMAGE_GEN_PENDING",
  DAILY_STATE_UNUSED: "DAILY_STATE_UNUSED",
  MISSING_MUSCLE_GROUPS: "MISSING_MUSCLE_GROUPS",
  MISSING_REST_PERIODS: "MISSING_REST_PERIODS",
  LOW_PERSONALIZATION: "LOW_PERSONALIZATION",
  MISSING_DESCRIPTION: "MISSING_DESCRIPTION",
  MISSING_FOCUS: "MISSING_FOCUS",
} as const;

export type QAAlertCode = (typeof QA_ALERT_CODES)[keyof typeof QA_ALERT_CODES];

export type QAAlertSeverity = "critical" | "warning" | "info";

export type QAAlertCategory =
  | "generation"
  | "images"
  | "exercises"
  | "structure"
  | "personalization"
  | "content";

export type QAGenerationStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "partial"
  | "failed";

export type QAImageGenerationStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "partial"
  | "failed"
  | "skipped";

export interface QAAlertItem {
  id: string; // Unique alert identifier
  severity: QAAlertSeverity;
  category: QAAlertCategory;
  code: QAAlertCode;
  message: string; // Human-readable message
  details?: Record<string, unknown>; // Additional context
}

export interface QAExerciseImageStatus {
  exercise_index: number;
  exercise_name: string;
  status: "pending" | "complete" | "failed" | "skipped";
  image_url: string | null;
  error: string | null;
}

export interface QAExerciseDetail {
  index: number;
  name: string;
  has_image: boolean;
  has_instructions: boolean;
  has_form_cues: boolean;
  has_sets_reps: boolean;
  has_rest_period: boolean;
  has_muscle_groups: boolean;
  has_equipment: boolean;
  has_duration: boolean;
  issues: string[];
}

export interface QAEquipmentMatch {
  passed: boolean;
  user_equipment: string[];
  required_equipment: string[];
  missing_equipment: string[];
  score: number;
}

export interface QADifficultyMatch {
  passed: boolean;
  user_level: string;
  workout_difficulty: string;
  is_appropriate: boolean;
  score: number;
}

export interface QAInjuryCheck {
  passed: boolean;
  user_injuries: string[];
  contraindicated_exercises: string[];
  score: number;
}

export interface QADailyStateApplied {
  passed: boolean;
  was_available: boolean;
  was_used: boolean;
  adjustments_made: string[];
}

/**
 * Quality Assurance schema embedded in TrainerWorkout documents.
 * Tracks completeness and quality of generated content for admin monitoring.
 */
export interface TrainerWorkoutQualityAssurance {
  // Schema version for future migrations
  schema_version: number;

  // Overall quality score (0-100, computed from alerts)
  overall_score: number;

  // Timestamp when QA was evaluated
  computed_at: QATimestamp;

  // ═══════════════════════════════════════════════════════
  // GENERATION STATUS
  // ═══════════════════════════════════════════════════════
  generation: {
    status: QAGenerationStatus;
    started_at: QATimestamp | null;
    completed_at: QATimestamp | null;
    duration_ms: number | null;
    error_message: string | null;
    retry_count: number;
  };

  // ═══════════════════════════════════════════════════════
  // IMAGE GENERATION
  // ═══════════════════════════════════════════════════════
  image_generation: {
    status: QAImageGenerationStatus;
    started_at: QATimestamp | null;
    completed_at: QATimestamp | null;
    duration_ms: number | null;
    total_requested: number;
    total_complete: number;
    total_failed: number;
    error_message: string | null;
    exercise_images: QAExerciseImageStatus[];
  };

  // ═══════════════════════════════════════════════════════
  // EXERCISE COMPLETENESS
  // ═══════════════════════════════════════════════════════
  exercise_quality: {
    total_exercises: number;
    with_images: number;
    with_instructions: number;
    with_form_cues: number;
    with_sets_reps: number;
    with_rest_periods: number;
    with_muscle_groups: number;
    with_equipment: number;
    with_duration: number;
    exercises: QAExerciseDetail[];
  };

  // ═══════════════════════════════════════════════════════
  // WORKOUT STRUCTURE
  // ═══════════════════════════════════════════════════════
  structure: {
    has_warmup: boolean;
    has_cooldown: boolean;
    has_main_workout: boolean;
    exercise_variety_score: number; // 0-100
    muscle_group_balance: number; // 0-100
    progressive_intensity: boolean;
    estimated_duration_accurate: boolean;
    calculated_duration_minutes: number;
  };

  // ═══════════════════════════════════════════════════════
  // PERSONALIZATION CHECKS
  // ═══════════════════════════════════════════════════════
  personalization: {
    equipment_match: QAEquipmentMatch;
    difficulty_match: QADifficultyMatch;
    injury_check: QAInjuryCheck;
    daily_state_applied: QADailyStateApplied;
    overall_score: number; // 0-100
  };

  // ═══════════════════════════════════════════════════════
  // CONTENT QUALITY
  // ═══════════════════════════════════════════════════════
  content_quality: {
    has_title: boolean;
    is_generic_title: boolean;
    has_description: boolean;
    has_focus: boolean;
    focus_is_valid: boolean;
    has_difficulty: boolean;
    has_duration: boolean;
    title_quality: "good" | "generic" | "missing";
    instructions_clarity: number; // 0-100
    overall_score: number;
  };

  // ═══════════════════════════════════════════════════════
  // ALERT SUMMARY
  // ═══════════════════════════════════════════════════════
  alerts: {
    critical_count: number;
    warning_count: number;
    info_count: number;
    has_critical: boolean;
    has_warning: boolean;
    items: QAAlertItem[];
  };
}

// -----------------------------
// Liability Waivers
// -----------------------------

/**
 * Liability waiver version stored in Firestore.
 * Only one active version exists at a time.
 */
export interface LiabilityWaiver {
  id: string; // doc id
  version: string; // e.g., "1.0.0"
  version_hash: string; // SHA-256 hash of waiver text for integrity
  title: string; // "Liability Waiver v1.0.0"
  content: string; // Full waiver text
  is_active: boolean; // Only one active at a time
  created_by: string; // admin user_id
  created_at: Timestamp;
  updated_at: Timestamp;
  effective_date: Timestamp; // When this version became active
}

/**
 * User agreement to a specific waiver version.
 * Stores full audit trail for legal compliance.
 */
export interface UserWaiverAgreement {
  id: string; // doc id
  user_id: string;
  waiver_version: string; // References liability_waivers.version
  waiver_version_hash: string; // For audit integrity
  full_name: string; // User's typed full name
  agreement_checkboxes: {
    medical_disclaimer: boolean;
    assumption_of_risk: boolean;
    release_of_liability: boolean;
    arbitration: boolean;
    ai_disclaimer: boolean;
    full_terms: boolean; // Final "I agree" checkbox
  };
  ip_address: string; // For audit trail
  user_agent: string | null; // Browser info
  created_at: Timestamp;
}

// -----------------------------
// Board (The Board content system)
// -----------------------------

// Re-export Board types from board.ts
export type {
  BoardPostType,
  BoardPriority,
  BoardStatus,
  BoardAccent,
  BoardIconKey,
  BoardEventType,
  BoardSurface,
  BoardTargeting,
  BoardFrequency,
  BoardPost,
  BoardPostUserState,
  BoardUserState,
  BoardEvent,
} from "./board";
