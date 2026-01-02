// Fitness goal options for multi-select
export type FitnessGoal =
  | 'Build muscle'
  | 'Lose fat'
  | 'Improve endurance'
  | 'Increase strength'
  | 'Mobility & flexibility'
  | 'General health'

// Fitness level options
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete'

// Activity level options
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active'

// Equipment access options
export type EquipmentAccess = 'none' | 'minimal' | 'home' | 'full_gym'

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
  equipment_access: EquipmentAccess
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
  equipment_access: 'home',
}
