import { z } from "zod";

/**
 * Validation schemas for Phase 2 profile fields
 */

export const workoutDurationSchema = z
  .number()
  .int()
  .min(15, "Workout duration must be at least 15 minutes")
  .max(120, "Workout duration must be at most 120 minutes")
  .nullable();

export const workoutFrequencySchema = z
  .number()
  .int()
  .min(3, "Workout frequency must be at least 3 days per week")
  .max(7, "Workout frequency must be at most 7 days per week")
  .nullable();

export const restBetweenSetsSchema = z
  .number()
  .int()
  .min(30, "Rest between sets must be at least 30 seconds")
  .max(120, "Rest between sets must be at most 120 seconds")
  .nullable();

export const trainingExperienceYearsSchema = z
  .number()
  .int()
  .min(0, "Training experience cannot be negative")
  .max(50, "Training experience cannot exceed 50 years")
  .nullable();

export const heartRateSchema = z
  .number()
  .int()
  .min(30, "Heart rate must be at least 30 BPM")
  .max(220, "Heart rate must be at most 220 BPM")
  .nullable();

export const bodyFatPercentageSchema = z
  .number()
  .min(0, "Body fat percentage cannot be negative")
  .max(100, "Body fat percentage cannot exceed 100%")
  .nullable();

export const strengthMaxSchema = z
  .number()
  .positive("Strength max must be a positive number")
  .nullable();

export const cardioTimeSchema = z
  .number()
  .int()
  .min(0, "Time cannot be negative")
  .nullable();

export const workoutMusicPreferenceSchema = z
  .enum(["upbeat", "calm", "none"])
  .nullable();

export const workoutIntensityPreferenceSchema = z
  .enum(["low", "moderate", "high", "variable"])
  .nullable();

export const stringArraySchema = z.array(z.string()).nullable();

export const macroTargetsSchema = z
  .object({
    protein_g: z.number().min(0).nullable(),
    carbs_g: z.number().min(0).nullable(),
    fat_g: z.number().min(0).nullable(),
  })
  .nullable();

/**
 * Validate MM:SS time format and convert to seconds
 */
export function validateTimeFormat(timeStr: string): number | null {
  if (!timeStr || !timeStr.includes(":")) return null;
  const parts = timeStr.split(":");
  if (parts.length !== 2) return null;
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  if (isNaN(minutes) || isNaN(seconds)) return null;
  if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
  return minutes * 60 + seconds;
}

/**
 * Phase 2 profile patch schema for validation
 */
export const phase2ProfilePatchSchema = z.object({
  preferred_workout_duration: workoutDurationSchema.optional(),
  workout_frequency_per_week: workoutFrequencySchema.optional(),
  preferred_workout_times: stringArraySchema.optional(),
  preferred_rest_between_sets: restBetweenSetsSchema.optional(),
  training_experience_years: trainingExperienceYearsSchema.optional(),
  sports_background: stringArraySchema.optional(),
  previous_training_programs: stringArraySchema.optional(),
  favorite_exercises: stringArraySchema.optional(),
  disliked_exercises: stringArraySchema.optional(),
  exercise_restrictions: stringArraySchema.optional(),
  current_bench_press_max: strengthMaxSchema.optional(),
  current_squat_max: strengthMaxSchema.optional(),
  current_deadlift_max: strengthMaxSchema.optional(),
  current_overhead_press_max: strengthMaxSchema.optional(),
  current_mile_time: cardioTimeSchema.optional(),
  current_5k_time: cardioTimeSchema.optional(),
  resting_heart_rate: heartRateSchema.optional(),
  target_weight: z.number().min(0).nullable().optional(),
  target_body_fat_percentage: bodyFatPercentageSchema.optional(),
  current_body_fat_percentage: bodyFatPercentageSchema.optional(),
  workout_music_preference: workoutMusicPreferenceSchema.optional(),
  workout_intensity_preference: workoutIntensityPreferenceSchema.optional(),
  prefers_group_workouts: z.boolean().nullable().optional(),
  prefers_outdoor_workouts: z.boolean().nullable().optional(),
  dietary_restrictions: stringArraySchema.optional(),
  food_allergies: stringArraySchema.optional(),
  daily_calorie_target: z.number().int().min(0).nullable().optional(),
  macro_targets: macroTargetsSchema.optional(),
});

export type Phase2ProfilePatch = z.infer<typeof phase2ProfilePatchSchema>;
