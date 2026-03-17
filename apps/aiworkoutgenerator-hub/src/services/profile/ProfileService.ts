import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { getAvailableCategories } from "@/lib/equipment-categories";
import type {
  ActivityLevel,
  Gender,
  PreferredUnits,
  UserProfile,
  FitnessLevel,
} from "@/types/firestore";

export type Phase1ProfileInput = {
  first_name: string;
  last_name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  preferred_units: PreferredUnits;
  fitness_level: FitnessLevel;
  current_activity_level: ActivityLevel;
  fitness_goals: string[];
  injuries: string[];
  injury_details: string | null;
  medical_conditions: string[];
  medical_notes: string | null;
  equipment_access: string[]; // Changed from EquipmentAccess enum to string[] (category strings)
  available_equipment: string[];
  // Phase 2 fields from onboarding steps 7-8 (optional)
  preferred_workout_duration?: number | null;
  workout_frequency_per_week?: number | null;
  preferred_workout_times?: string[] | null;
  preferred_rest_between_sets?: number | null;
  training_experience_years?: number | null;
  sports_background?: string[] | null;
  previous_training_programs?: string[] | null;
};

export class ProfileService {
  static profileDoc(uid: string) {
    return doc(getDbInstance(), "user_profiles", uid);
  }

  /**
   * Convert legacy EquipmentAccess enum to string[] categories for backward compatibility
   */
  private static migrateEquipmentAccess(
    equipmentAccess: unknown,
    fitnessLevel?: FitnessLevel
  ): string[] {
    // If already an array, return as-is
    if (Array.isArray(equipmentAccess)) {
      return equipmentAccess;
    }

    // If it's a string (legacy enum), convert to categories
    if (typeof equipmentAccess === "string") {
      switch (equipmentAccess) {
        case "none":
          return [];
        case "minimal":
          return ["general"];
        case "home":
          return ["general", "strength", "functional"];
        case "full_gym":
          // Return all categories for the user's fitness level
          return fitnessLevel ? getAvailableCategories(fitnessLevel) : [];
        default:
          // Unknown enum value, return empty array
          return [];
      }
    }

    // Fallback: return empty array
    return [];
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(ProfileService.profileDoc(uid));
    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    // TODO: Add runtime validation (e.g., Zod schema) to ensure document data
    // conforms to UserProfile interface. Type assertion bypasses type safety
    // and could lead to runtime errors if Firestore documents have missing or
    // incorrect fields.

    // Migrate equipment_access from enum to string[] if needed
    const profile = data as UserProfile;
    if (
      profile.equipment_access &&
      typeof profile.equipment_access === "string"
    ) {
      // Legacy enum value - migrate to categories
      profile.equipment_access = this.migrateEquipmentAccess(
        profile.equipment_access,
        profile.fitness_level
      );
    } else if (!Array.isArray(profile.equipment_access)) {
      // Ensure it's an array (fallback for any other type)
      profile.equipment_access = [];
    }

    return profile;
  }

  static async createUserProfile(uid: string, input: Phase1ProfileInput) {
    const now = serverTimestamp();
    const display_name = `${input.first_name} ${input.last_name}`.trim();

    const payload: Record<string, unknown> = {
      id: uid,
      user_id: uid,
      display_name,
      onboarding_completed: true,
      onboarding_completed_at: now,
      profile_completeness: 70,
      last_workout_generated_at: null,
      created_at: now,
      updated_at: now,
      // phase 1 fields
      first_name: input.first_name,
      last_name: input.last_name,
      age: input.age,
      gender: input.gender,
      weight: input.weight,
      height: input.height,
      preferred_units: input.preferred_units,
      fitness_level: input.fitness_level,
      current_activity_level: input.current_activity_level,
      fitness_goals: input.fitness_goals,
      injuries: input.injuries,
      injury_details: input.injury_details,
      medical_conditions: input.medical_conditions,
      medical_notes: input.medical_notes,
      equipment_access: input.equipment_access,
      available_equipment: input.available_equipment,
      // phase 2 fields from onboarding (steps 7-8) - use provided values or null
      preferred_workout_duration: input.preferred_workout_duration ?? null,
      workout_frequency_per_week: input.workout_frequency_per_week ?? null,
      preferred_workout_times: input.preferred_workout_times ?? null,
      preferred_rest_between_sets: input.preferred_rest_between_sets ?? null,
      training_experience_years: input.training_experience_years ?? null,
      sports_background: input.sports_background ?? null,
      previous_training_programs: input.previous_training_programs ?? null,
      // phase 2 fields not in onboarding (explicit nulls)
      favorite_exercises: null,
      disliked_exercises: null,
      exercise_restrictions: null,
      current_bench_press_max: null,
      current_squat_max: null,
      current_deadlift_max: null,
      current_overhead_press_max: null,
      current_mile_time: null,
      current_5k_time: null,
      resting_heart_rate: null,
      target_weight: null,
      target_body_fat_percentage: null,
      current_body_fat_percentage: null,
      workout_music_preference: null,
      workout_intensity_preference: null,
      prefers_group_workouts: null,
      prefers_outdoor_workouts: null,
      dietary_restrictions: null,
      food_allergies: null,
      daily_calorie_target: null,
      macro_targets: null,
    };

    await setDoc(ProfileService.profileDoc(uid), payload, { merge: true });
  }

  static async updateUserProfile(
    uid: string,
    patch: Partial<UserProfile>
  ): Promise<void> {
    const ref = ProfileService.profileDoc(uid);
    const data: Record<string, unknown> = {
      ...patch,
      updated_at: serverTimestamp(),
    };
    await updateDoc(ref, data);
  }

  static hasCompletedOnboarding(profile: UserProfile | null): boolean {
    return !!profile?.onboarding_completed;
  }
}
