// User Profile Data (Split Strategy)
export type UnitSystem = 'standard' | 'metric';

// 1. Hub Profile (Read-only from Hub)
export interface HubProfile {
  id: string; // UUID
  email?: string;
  age: number;
  gender: string;
  weight: number; // stored in lbs if standard, kg if metric
  height: number; // stored in inches if standard, cm if metric
  units: UnitSystem;
  goals: string[];
  birthday?: string;
}

// 2. Trainer Profile (Local Spoke DB)
export interface TrainerProfile {
  id?: string; // UUID
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  injuries: string[];
  medicalConditions: string[]; // Kept locally for context
  equipmentAccess: string[];
  preferredWorkoutStyles: string[];
}

// Combined for App Usage
/**
 * UserProfile combines fields from both HubProfile and TrainerProfile.
 *
 * Field ownership:
 * - Fields from HubProfile are read-only and should only be updated via the Hub API.
 *   Do NOT update HubProfile fields locally.
 * - Fields from TrainerProfile are managed locally and can be updated via the local database.
 */
export type UserProfile = HubProfile & TrainerProfile;

// Daily Check-in Data (Dynamic)
export interface DailyContext {
  duration: number; // minutes
  sleepQuality: number; // 1-10
  energyLevel: number; // 1-10
  soreness: string[]; // specific muscles or 'None'
  targetMuscleGroups: string[];
  equipmentAvailable: string[];
  workoutType: string; // e.g., HIIT, Strength, Yoga
  selectedFocus: string; // The specific objective selected from the list
}

// Trainer Persona
export enum TrainerType {
  FUNCTIONAL = 'Functional Training Specialist',
  HYPERTROPHY = 'Bodybuilding/Hypertrophy Coach',
  POWERLIFTING = 'Strength & Powerlifting Coach',
  YOGA = 'Yoga & Mobility Instructor',
  HIIT = 'High-Intensity Interval Trainer',
  REHAB = 'Rehabilitation & Corrective Exercise Specialist',
}

export const TRAINER_FOCUS_OPTIONS: Record<TrainerType, string[]> = {
  [TrainerType.FUNCTIONAL]: [
    'Core Stability',
    'Balance & Coordination',
    'Movement Mechanics',
    'Total Body Strength',
    'Athletic Conditioning',
    'Joint Integrity',
    'Everyday Performance',
  ],
  [TrainerType.HYPERTROPHY]: [
    'Muscle Growth (Hypertrophy)',
    'Aesthetics & Symmetry',
    'Isolation Training',
    'Push/Pull Splits',
    'Time Under Tension',
    'Volume Training',
    'Muscle Definition',
  ],
  [TrainerType.POWERLIFTING]: [
    'Maximal Strength',
    'Power Output',
    'Compound Lifts',
    'Periodization & Progression',
    'CNS Efficiency',
    'Low-Rep High Load',
    'Technique Mastery',
  ],
  [TrainerType.YOGA]: [
    'Flexibility Training',
    'Mobility Drills',
    'Breathwork & Meditation',
    'Flow Sequences',
    'Balance & Control',
    'Recovery & Restoration',
    'Mind-Body Connection',
  ],
  [TrainerType.HIIT]: [
    'Fat Burn',
    'Metabolic Conditioning (MetCon)',
    'Tabata & Timed Circuits',
    'Full-Body HIIT',
    'Speed & Agility',
    'Core Burnouts',
    'Quick Burn (≤20min)',
  ],
  [TrainerType.REHAB]: [
    'Prehab & Injury Prevention',
    'Postural Correction',
    'Pain-Free Movement',
    'Joint-Specific Protocols',
    'Recovery & Mobility',
    'Activation & Stability',
    'Rehab Reinforcement',
  ],
};

// Structured Workout Response (from Gemini) & DB Structure
export interface ExerciseSet {
  reps?: string;
  weight?: string; // Suggested intensity
  actualWeight?: string; // User logged weight
  duration?: string; // e.g., "45s"
  rest?: string;
  notes?: string;
  isUserAdded?: boolean;
}

export interface Exercise {
  id?: string; // From Library
  name: string;
  sets: number;
  setDetails: ExerciseSet[];
  tempo?: string;
  cues: string[];
  detailedInstructions?: string;
  muscleTarget: string;
}

export interface WorkoutSection {
  type: 'Warmup' | 'Main Workout' | 'Cooldown' | 'Finisher';
  exercises: Exercise[];
  durationEstimate: string;
}

export interface PersonalizationDetail {
  attribute: string; // e.g. "Low Sleep (4/10)"
  adjustment: string; // e.g. "Reduced volume and increased rest times"
}

export interface WorkoutPlan {
  id?: string; // Database ID
  createdAt?: string; // ISO Date string
  trainerType?: TrainerType; // The persona used to generate this
  focus?: string; // The specific objective of this workout
  title: string;
  description: string;
  difficulty: string;
  trainerNotes: string; // The "Voice" of the persona
  sections: WorkoutSection[];
  totalDuration: number;
  estimatedCalories: number;
  personalization?: PersonalizationDetail[];
}

// DB Interfaces (for direct mapping)
export interface DBExercise {
  id: string;
  name: string;
  muscle_target: string;
  equipment_required: string[];
  description: string;
}

export interface DBWorkoutHistory {
  id: string;
  user_id: string;
  workout_id: string;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  calories_burned: number;
  feeling_rating: number;
  notes: string;
}

export interface ChefExportSummary {
  workout_name: string;
  calories_burned_estimate: number;
  intensity_level: string;
  muscle_groups_targeted: string[];
  workout_duration: number; // minutes
}
