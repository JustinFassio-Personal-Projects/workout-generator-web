import type { FitnessLevel } from '@/types/onboarding'

/**
 * Category labels for display
 */
export const categoryLabels: Record<string, string> = {
  general: 'General / Universal',
  strength: 'Strength Training',
  functional: 'Functional Training',
  cardio: 'Cardio',
  calisthenics: 'Calisthenics',
  yoga: 'Yoga',
  pilates: 'Pilates',
  mobility: 'Mobility',
  strongman: 'Strongman',
  olympic: 'Olympic Lifting',
  recovery: 'Recovery',
  combat: 'Combat Sports',
  rehab: 'Rehabilitation',
  outdoor: 'Outdoor Training',
  aquatic: 'Aquatic Training',
  smart: 'Smart Equipment',
}

/**
 * Cumulative category mapping by fitness level.
 * Each level includes all categories from previous levels plus new ones.
 */
const categoryMapping: Record<FitnessLevel, string[]> = {
  beginner: ['general', 'strength', 'functional', 'cardio'],
  intermediate: [
    'general',
    'strength',
    'functional',
    'cardio',
    'calisthenics',
    'yoga',
    'pilates',
    'mobility',
  ],
  advanced: [
    'general',
    'strength',
    'functional',
    'cardio',
    'calisthenics',
    'yoga',
    'pilates',
    'mobility',
    'strongman',
    'olympic',
    'recovery',
  ],
  athlete: [
    'general',
    'strength',
    'functional',
    'cardio',
    'calisthenics',
    'yoga',
    'pilates',
    'mobility',
    'strongman',
    'olympic',
    'recovery',
    'combat',
    'rehab',
    'outdoor',
    'aquatic',
    'smart',
  ],
}

/**
 * Get available equipment categories for a given fitness level.
 * Categories are revealed cumulatively - each level includes all previous categories plus new ones.
 *
 * @param fitnessLevel - The user's fitness level
 * @returns Array of available category strings for the fitness level
 */
export function getAvailableCategoriesByFitnessLevel(fitnessLevel: FitnessLevel): string[] {
  return categoryMapping[fitnessLevel] || categoryMapping.beginner
}

/**
 * Get display label for a category string
 *
 * @param category - The category string (e.g., 'strength', 'cardio')
 * @returns User-friendly display label
 */
export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category
}
