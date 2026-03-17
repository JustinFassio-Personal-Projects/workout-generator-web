/**
 * Types for website-to-app onboarding handoff (Phase A -> Phase B)
 *
 * These types represent the data collected on the marketing website
 * (aiworkoutgenerator.com) and passed to the app via URL parameters.
 */

import type {
  Gender,
  FitnessLevel,
  ActivityLevel,
  PreferredUnits,
} from "./firestore";

/**
 * Data collected on the website (Phase A) and passed via URL params.
 * This is a subset of the full profile - remaining fields are collected in Phase B.
 */
export type WebsiteOnboardingData = {
  gender?: Gender;
  age?: number;
  preferred_units: PreferredUnits;
  fitness_level: FitnessLevel;
  current_activity_level: ActivityLevel;
  fitness_goals: string[];
  equipment_access: string[]; // Changed from EquipmentAccess enum to string[] (category strings)
};

/**
 * Session storage schema for persisting Phase A data across auth flow
 */
export interface StoredPhaseAData {
  data: WebsiteOnboardingData;
  source: string; // Analytics tracking (e.g., 'website_builder')
  timestamp: number; // Unix timestamp for expiration check
}

/**
 * Storage key for Phase A data in sessionStorage
 */
export const PHASE_A_STORAGE_KEY = "workout_builder_phase_a";

/**
 * Expiration time for stored Phase A data (24 hours in milliseconds)
 */
export const PHASE_A_EXPIRATION_MS = 24 * 60 * 60 * 1000;
