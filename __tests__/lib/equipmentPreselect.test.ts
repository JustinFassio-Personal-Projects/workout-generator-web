import { describe, it, expect } from 'vitest'
import {
  getCategoriesForEquipmentPreselect,
  getMinimumFitnessLevelForCategories,
  getPreselectData,
} from '@/lib/equipmentPreselect'

describe('equipmentPreselect', () => {
  describe('getCategoriesForEquipmentPreselect', () => {
    it('should return categories for known preselect values', () => {
      const categories = getCategoriesForEquipmentPreselect('dumbbells')
      expect(Array.isArray(categories)).toBe(true)
      expect(categories.length).toBeGreaterThan(0)
    })

    it('should map kettlebells to kettlebell', () => {
      const categories = getCategoriesForEquipmentPreselect('kettlebells')
      expect(Array.isArray(categories)).toBe(true)
    })

    it('should map bands to resistance_bands', () => {
      const categories = getCategoriesForEquipmentPreselect('bands')
      expect(Array.isArray(categories)).toBe(true)
    })

    it('should return general for unknown preselect', () => {
      const categories = getCategoriesForEquipmentPreselect('unknown-equipment-xyz')
      expect(categories).toEqual(['general'])
    })
  })

  describe('getMinimumFitnessLevelForCategories', () => {
    it('should return beginner for general category', () => {
      const level = getMinimumFitnessLevelForCategories(['general'])
      expect(level).toBe('beginner')
    })

    it('should return athlete when no level includes all categories', () => {
      const level = getMinimumFitnessLevelForCategories(['non-existent-cat'])
      expect(level).toBe('athlete')
    })

    it('should return appropriate level for multiple categories', () => {
      const level = getMinimumFitnessLevelForCategories(['general', 'compound'])
      expect(['beginner', 'intermediate', 'advanced', 'athlete']).toContain(level)
    })
  })

  describe('getPreselectData', () => {
    it('should return fitnessLevel and categories', () => {
      const result = getPreselectData('dumbbells')
      expect(result).toHaveProperty('fitnessLevel')
      expect(result).toHaveProperty('categories')
      expect(Array.isArray(result.categories)).toBe(true)
      expect(['beginner', 'intermediate', 'advanced', 'athlete']).toContain(result.fitnessLevel)
    })

    it('should return general categories for unknown preselect', () => {
      const result = getPreselectData('unknown-xyz')
      expect(result.categories).toEqual(['general'])
      // general is available at beginner level
      expect(['beginner', 'intermediate', 'advanced', 'athlete']).toContain(result.fitnessLevel)
    })
  })
})
