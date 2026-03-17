/**
 * Centralized source of truth for Phase 2 profile preset options
 * Prevents hardcoding lists across multiple components
 */

export const WORKOUT_DURATIONS = [15, 30, 45, 60, 90] as const;

export const WORKOUT_FREQUENCY_OPTIONS = [3, 4, 5, 6, 7] as const;

export const WORKOUT_TIMES = ["morning", "afternoon", "evening"] as const;

export const REST_BETWEEN_SETS_OPTIONS = [30, 60, 90, 120] as const;

export const SPORTS_BACKGROUND_OPTIONS = [
  "basketball",
  "swimming",
  "running",
  "cycling",
  "martial_arts",
  "soccer",
  "tennis",
  "volleyball",
  "baseball",
  "football",
  "hockey",
  "gymnastics",
  "dancing",
  "yoga",
  "pilates",
  "crossfit",
  "powerlifting",
  "bodybuilding",
  "calisthenics",
  "rock_climbing",
  "surfing",
  "skiing",
  "snowboarding",
  "none",
] as const;

export const PREVIOUS_TRAINING_PROGRAMS = [
  "crossfit",
  "bodybuilding",
  "powerlifting",
  "calisthenics",
  "strongman",
  "olympic_lifting",
  "powerbuilding",
  "p90x",
  "insanity",
  "beachbody",
  "orange_theory",
  "f45",
  "barry_s_bootcamp",
  "peloton",
  "nike_training_club",
  "freeletics",
  "none",
] as const;

export const EXERCISE_PRESETS = [
  // Upper Body
  "push_ups",
  "pull_ups",
  "dips",
  "bench_press",
  "overhead_press",
  "barbell_rows",
  "dumbbell_rows",
  "lat_pulldowns",
  "chest_flyes",
  "shoulder_press",
  "lateral_raises",
  "bicep_curls",
  "tricep_extensions",
  "hammer_curls",
  "face_pulls",
  "cable_crossovers",
  // Lower Body
  "squats",
  "deadlifts",
  "lunges",
  "leg_press",
  "leg_curls",
  "leg_extensions",
  "calf_raises",
  "bulgarian_split_squats",
  "romanian_deadlifts",
  "hip_thrusts",
  "glute_bridges",
  // Core
  "planks",
  "crunches",
  "sit_ups",
  "russian_twists",
  "mountain_climbers",
  "leg_raises",
  "ab_wheel",
  "dead_bugs",
  "bird_dogs",
  // Cardio
  "running",
  "cycling",
  "rowing",
  "jumping_jacks",
  "burpees",
  "high_knees",
  "jump_rope",
  "sprints",
  "interval_training",
  // Flexibility/Mobility
  "stretching",
  "yoga",
  "pilates",
  "foam_rolling",
  "dynamic_warmup",
] as const;

export const DIETARY_RESTRICTIONS = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "dairy_free",
  "keto",
  "paleo",
  "whole30",
  "mediterranean",
  "low_carb",
  "low_fat",
  "low_sodium",
  "halal",
  "kosher",
  "pescatarian",
  "flexitarian",
  "none",
] as const;

export const FOOD_ALLERGIES = [
  "nuts",
  "shellfish",
  "dairy",
  "eggs",
  "soy",
  "wheat",
  "fish",
  "sesame",
  "peanuts",
  "tree_nuts",
  "none",
] as const;

export const WORKOUT_MUSIC_PREFERENCES = ["upbeat", "calm", "none"] as const;

export const WORKOUT_INTENSITY_PREFERENCES = [
  "low",
  "moderate",
  "high",
  "variable",
] as const;

// Helper type exports for TypeScript
export type WorkoutDuration = (typeof WORKOUT_DURATIONS)[number];
export type WorkoutFrequency = (typeof WORKOUT_FREQUENCY_OPTIONS)[number];
export type WorkoutTime = (typeof WORKOUT_TIMES)[number];
export type RestBetweenSets = (typeof REST_BETWEEN_SETS_OPTIONS)[number];
export type SportsBackground = (typeof SPORTS_BACKGROUND_OPTIONS)[number];
export type PreviousTrainingProgram =
  (typeof PREVIOUS_TRAINING_PROGRAMS)[number];
export type ExercisePreset = (typeof EXERCISE_PRESETS)[number];
export type DietaryRestriction = (typeof DIETARY_RESTRICTIONS)[number];
export type FoodAllergy = (typeof FOOD_ALLERGIES)[number];
export type WorkoutMusicPreference = (typeof WORKOUT_MUSIC_PREFERENCES)[number];
export type WorkoutIntensityPreference =
  (typeof WORKOUT_INTENSITY_PREFERENCES)[number];
