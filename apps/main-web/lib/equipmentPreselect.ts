import type { FitnessLevel } from '@/types/onboarding'
import { equipmentData } from '@/data/equipment'
import { getAvailableCategoriesByFitnessLevel } from '@/data/equipment-categories'

/**
 * Maps equipment preselect values (from URL) to actual equipment IDs
 */
const equipmentPreselectMap: Record<string, string> = {
  dumbbells: 'dumbbells',
  kettlebells: 'kettlebell', // Note: singular in data
  barbell: 'barbell',
  bands: 'resistance_bands',
  machines: 'cable_machine', // Default to cable machine for machines
  bodyweight: 'none',
}

/**
 * Get equipment categories for a given equipment preselect value
 *
 * @param preselectValue - The preselect value from URL (e.g., 'dumbbells', 'kettlebells')
 * @returns Array of category strings for that equipment
 */
export function getCategoriesForEquipmentPreselect(preselectValue: string): string[] {
  const equipmentId = equipmentPreselectMap[preselectValue] || preselectValue

  // Find equipment in data
  const equipment = equipmentData.find(item => item.id === equipmentId)

  if (equipment) {
    return equipment.categories
  }

  // Fallback: try to find by preselect value directly
  const directMatch = equipmentData.find(item => item.id === preselectValue)
  if (directMatch) {
    return directMatch.categories
  }

  // Default fallback
  return ['general']
}

/**
 * Find the minimum fitness level that includes all the given categories
 *
 * @param categories - Array of category strings
 * @returns The minimum fitness level that includes all categories
 */
export function getMinimumFitnessLevelForCategories(categories: string[]): FitnessLevel {
  const levels: FitnessLevel[] = ['beginner', 'intermediate', 'advanced', 'athlete']

  for (const level of levels) {
    const availableCategories = getAvailableCategoriesByFitnessLevel(level)
    const allCategoriesAvailable = categories.every(cat => availableCategories.includes(cat))

    if (allCategoriesAvailable) {
      return level
    }
  }

  // If no level includes all categories, return athlete (highest level)
  return 'athlete'
}

/**
 * Get preselect data from equipment preselect value
 * Returns both the minimum fitness level and the categories to select
 *
 * @param preselectValue - The preselect value from URL
 * @returns Object with fitnessLevel and categories
 */
export function getPreselectData(preselectValue: string): {
  fitnessLevel: FitnessLevel
  categories: string[]
} {
  const categories = getCategoriesForEquipmentPreselect(preselectValue)
  const fitnessLevel = getMinimumFitnessLevelForCategories(categories)

  return {
    fitnessLevel,
    categories,
  }
}

/**
 * Get preselect data from multiple equipment preselect values.
 * Merges and dedupes categories, then computes minimum fitness level for the union.
 *
 * @param preselectValues - Array of preselect values from URL
 * @returns Object with fitnessLevel and merged categories
 */
export function getPreselectDataForMultiple(preselectValues: string[]): {
  fitnessLevel: FitnessLevel
  categories: string[]
} {
  if (preselectValues.length === 0) {
    return { fitnessLevel: 'beginner', categories: ['general'] }
  }
  const allCategories = preselectValues.flatMap(v => getCategoriesForEquipmentPreselect(v))
  const categories = [...new Set(allCategories)]
  const fitnessLevel = getMinimumFitnessLevelForCategories(categories)
  return {
    fitnessLevel,
    categories,
  }
}
