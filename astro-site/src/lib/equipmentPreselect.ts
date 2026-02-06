import type { FitnessLevel } from '@/types/onboarding'
import { getAvailableCategoriesByFitnessLevel } from '@/data/equipment-categories'

/**
 * Maps equipment preselect values (from URL) to category arrays.
 * Aligned with Next.js lib/equipmentPreselect + data/equipment category lists.
 */
const preselectToCategories: Record<string, string[]> = {
  dumbbells: ['general', 'strength'],
  kettlebells: ['general', 'strength', 'functional'],
  barbell: ['general', 'strength'],
  bands: ['general', 'strength', 'functional'],
  machines: ['general', 'strength', 'cardio'],
  bodyweight: ['general', 'functional', 'calisthenics'],
}

/**
 * Get equipment categories for a given preselect value from URL.
 */
export function getCategoriesForEquipmentPreselect(preselectValue: string): string[] {
  const normalized = preselectValue.toLowerCase().trim()
  return preselectToCategories[normalized] ?? ['general', 'strength']
}

/**
 * Minimum fitness level that includes all given categories.
 */
export function getMinimumFitnessLevelForCategories(categories: string[]): FitnessLevel {
  const levels: FitnessLevel[] = ['beginner', 'intermediate', 'advanced', 'athlete']
  for (const level of levels) {
    const available = getAvailableCategoriesByFitnessLevel(level)
    if (categories.every(c => available.includes(c))) return level
  }
  return 'athlete'
}

/**
 * Get preselect data from URL ?preselect= value.
 */
export function getPreselectData(preselectValue: string): {
  fitnessLevel: FitnessLevel
  categories: string[]
} {
  const categories = getCategoriesForEquipmentPreselect(preselectValue)
  const fitnessLevel = getMinimumFitnessLevelForCategories(categories)
  return { fitnessLevel, categories }
}
