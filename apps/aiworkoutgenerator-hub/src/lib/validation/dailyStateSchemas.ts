import { z } from "zod";

import type {
  CyclePhase,
  DataSource,
  LocationType,
  SorenessArea,
  TimeOfDay,
  UserDailyState,
} from "@/types/firestore";

const tenPointScaleSchema = z
  .number()
  .int()
  .min(1, "Value must be at least 1")
  .max(10, "Value must be at most 10");

export const sorenessAreaSchema = z.object({
  area: z.string().min(1, "Area is required"),
  level: tenPointScaleSchema,
});

export const sorenessAreasSchema = z.array(sorenessAreaSchema);

export const muscleGroupFocusSchema = z.object({
  area: z.string().min(1, "Area is required"),
  percentage: z.number().int().min(0).max(100),
  locked: z.boolean(),
});

export const muscleGroupFocusArraySchema = z
  .array(muscleGroupFocusSchema)
  .superRefine((arr, ctx) => {
    if (arr.length === 0) return;
    const total = arr.reduce((sum, g) => sum + g.percentage, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `muscle_group_focus percentages must sum to 100 (got ${total})`,
      });
    }
    const areas = arr.map((g) => g.area);
    const duplicates = areas.filter((a, i) => areas.indexOf(a) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `muscle_group_focus must not contain duplicate areas: ${[...new Set(duplicates)].join(", ")}`,
      });
    }
  });

export const locationTypeSchema = z.enum([
  "home",
  "gym",
  "outdoor",
  "hotel",
  "office",
  "other",
] satisfies readonly LocationType[]);

export const timeOfDaySchema = z.enum([
  "early_morning",
  "morning",
  "afternoon",
  "evening",
  "night",
] satisfies readonly TimeOfDay[]);

export const cyclePhaseSchema = z
  .enum([
    "menstrual",
    "follicular",
    "ovulation",
    "luteal",
  ] satisfies readonly CyclePhase[])
  .nullable();

export const dataSourceSchema = z.enum([
  "manual",
  "wearable",
  "hybrid",
] satisfies readonly DataSource[]);

export const sleepHoursSchema = z
  .number()
  .min(0, "Sleep hours cannot be negative")
  .max(24, "Sleep hours cannot exceed 24")
  .nullable();

export const availableTimeSchema = z
  .number()
  .int()
  .min(0, "Available time cannot be negative")
  .max(240, "Available time cannot exceed 240 minutes")
  .nullable();

/**
 * Daily Check-In patch: user-editable fields for a given day.
 * Derived fields (id/date/time_of_day/overall_soreness/timestamps) are computed.
 */
export const dailyStatePatchSchema = z.object({
  energy_level: tenPointScaleSchema,
  sleep_quality: tenPointScaleSchema,
  sleep_hours: sleepHoursSchema,
  stress_level: tenPointScaleSchema,
  motivation_level: tenPointScaleSchema,

  soreness_areas: sorenessAreasSchema,

  // Muscle group focus (workout target distribution)
  muscle_group_focus: muscleGroupFocusArraySchema,

  current_location: locationTypeSchema,
  available_time: availableTimeSchema,

  // Optional context fields
  weather_condition: z.string().min(1).nullable(),
  temperature: z.number().nullable(),
  cycle_phase: cyclePhaseSchema,
  cycle_symptoms: z.array(z.string().min(1)).nullable(),

  // Data source (default manual for check-in)
  data_source: dataSourceSchema.default("manual"),
});

export type DailyStatePatchInput = z.input<typeof dailyStatePatchSchema>;
export type DailyStatePatch = z.infer<typeof dailyStatePatchSchema>;

export function getTimeOfDay(now = new Date()): TimeOfDay {
  const hour = now.getHours();
  if (hour < 6) return "night";
  if (hour < 9) return "early_morning";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

export function computeOverallSoreness(areas: SorenessArea[]): number {
  if (!areas || areas.length === 0) return 0;
  const sum = areas.reduce((acc, a) => acc + a.level, 0);
  return sum / areas.length;
}

export function toISODateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function toISODateTimeString(d = new Date()): string {
  return d.toISOString();
}

/**
 * Build a complete `UserDailyState` object for writing to Firestore.
 * Caller provides timestamps separately (client uses serverTimestamp()).
 */
export function buildDailyStateDoc(params: {
  uid: string;
  dateISO: string;
  patch: DailyStatePatch;
  created_at: UserDailyState["created_at"];
  updated_at: UserDailyState["updated_at"];
  saved_at_datetime: string; // ISO 8601 datetime string
}): Omit<UserDailyState, "workout_generated_at"> & {
  workout_generated_at: null;
} {
  const { uid, dateISO, patch, created_at, updated_at, saved_at_datetime } =
    params;
  const id = `${uid}_${dateISO}`;

  return {
    id,
    user_id: uid,
    date: dateISO,

    energy_level: patch.energy_level,
    sleep_quality: patch.sleep_quality,
    sleep_hours: patch.sleep_hours ?? null,
    stress_level: patch.stress_level,
    motivation_level: patch.motivation_level,

    soreness_areas: patch.soreness_areas,
    overall_soreness: computeOverallSoreness(patch.soreness_areas),

    muscle_group_focus: patch.muscle_group_focus,

    current_location: patch.current_location,
    available_time: patch.available_time ?? null,
    time_of_day: getTimeOfDay(),
    weather_condition: patch.weather_condition ?? null,
    temperature: patch.temperature ?? null,

    cycle_phase: patch.cycle_phase ?? null,
    cycle_symptoms: patch.cycle_symptoms ?? null,

    // Activity context placeholders (can be computed later)
    days_since_last_workout: null,
    workouts_this_week: 0,
    consecutive_workout_days: 0,

    data_source: patch.data_source,
    wearable_connection_id: null,

    created_at,
    updated_at,
    saved_at_datetime, // Human-readable date+time string (ISO 8601)

    workout_id: null,
    workout_generated_at: null,
  };
}
