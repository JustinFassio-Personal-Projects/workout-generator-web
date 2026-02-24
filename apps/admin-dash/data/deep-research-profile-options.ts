export interface LabeledOption<T = string> {
  value: T
  label: string
}

export const equipmentZoneOptions: LabeledOption[] = [
  { value: 'any', label: 'Any' },
  { value: 'living_room', label: 'Living Room (Minimalist)' },
  { value: 'big_box_gym', label: 'Big Box Gym' },
  { value: 'home_gym', label: 'Home Gym (Garage Iron)' },
  { value: 'hotel', label: 'Hotel (Standard)' },
]

export const experienceOptions: LabeledOption[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export const injuryOptions: LabeledOption[] = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'back', label: 'Back' },
  { value: 'knee', label: 'Knee' },
]

export const goalOptions: LabeledOption[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
]

export const dietTypeOptions: LabeledOption[] = [
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'mediterranean', label: 'Mediterranean' },
]

export const nutritionGoalOptions: LabeledOption[] = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'performance', label: 'Performance' },
]

export const dietaryRestrictionOptions: LabeledOption[] = [
  { value: 'gluten_free', label: 'Gluten-free' },
  { value: 'dairy_free', label: 'Dairy-free' },
  { value: 'low_sodium', label: 'Low sodium' },
]

export const macroFocusOptions: LabeledOption[] = [
  { value: 'high_protein', label: 'High protein' },
  { value: 'low_carb', label: 'Low carb' },
  { value: 'balanced', label: 'Balanced' },
]

export const DAYS_PER_WEEK_MIN = 1
export const DAYS_PER_WEEK_MAX = 7
export const DAYS_PER_WEEK_DEFAULT = 4
