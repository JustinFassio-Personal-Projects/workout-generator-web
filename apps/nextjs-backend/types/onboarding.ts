// Fitness goal options for multi-select
export type FitnessGoal =
  | 'Build muscle'
  | 'Lose fat'
  | 'Increase strength'
  | 'Improve endurance'
  | 'Get back in shape'
  | 'Move better / reduce pain'
  | 'Improve overall fitness'

// Fitness level options
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete'

// Activity level options
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active'

// Equipment access options (deprecated - now using array of category strings)
export type EquipmentAccess = 'none' | 'minimal' | 'home' | 'full_gym'

// Equipment category strings (from equipment catalog)
export type EquipmentCategory =
  | 'general'
  | 'strength'
  | 'functional'
  | 'cardio'
  | 'calisthenics'
  | 'yoga'
  | 'pilates'
  | 'mobility'
  | 'strongman'
  | 'olympic'
  | 'recovery'
  | 'combat'
  | 'rehab'
  | 'outdoor'
  | 'aquatic'
  | 'smart'

// Gender options (optional field)
export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say'

// Unit preferences
export interface PreferredUnits {
  weight: 'lb' | 'kg'
  height: 'in' | 'cm'
  distance: 'mi' | 'km'
  temperature: 'f' | 'c'
}

// Main onboarding data collected on the website (Phase A)
export interface WebsiteOnboardingData {
  gender?: Gender
  age?: number
  preferred_units: PreferredUnits
  fitness_level: FitnessLevel
  current_activity_level: ActivityLevel
  fitness_goals: FitnessGoal[]
  equipment_access: string[] // Array of equipment category strings
}

// Default values for form initialization
export const DEFAULT_ONBOARDING_DATA: WebsiteOnboardingData = {
  gender: undefined,
  age: undefined,
  preferred_units: {
    weight: 'lb',
    height: 'in',
    distance: 'mi',
    temperature: 'f',
  },
  fitness_level: 'beginner',
  current_activity_level: 'moderately_active',
  fitness_goals: [],
  equipment_access: ['general', 'strength'], // Default categories for beginner level
}
