import type { FitnessLevel } from '@/types/onboarding'
import { getAvailableCategoriesByFitnessLevel } from '@/data/equipment-categories'

const preselectToCategories: Record<string, string[]> = {
  dumbbells: ['general', 'strength', 'functional'],
  kettlebells: ['general', 'strength', 'functional'],
  barbell: ['general', 'strength', 'functional', 'cardio'],
  bands: ['general', 'strength', 'functional'],
  bodyweight: ['general', 'calisthenics'],
  machines: ['general', 'strength', 'functional', 'cardio'],
}

export function getPreselectData(preselectValue: string): {
  fitnessLevel: FitnessLevel
  categories: string[]
} {
  const categories = preselectToCategories[preselectValue.toLowerCase()] || ['general', 'strength']
  const levels: FitnessLevel[] = ['beginner', 'intermediate', 'advanced', 'athlete']
  let fitnessLevel: FitnessLevel = 'beginner'
  for (const level of levels) {
    const available = getAvailableCategoriesByFitnessLevel(level)
    if (categories.every(c => available.includes(c))) {
      fitnessLevel = level
      break
    }
    fitnessLevel = level
  }
  return { fitnessLevel, categories }
}
