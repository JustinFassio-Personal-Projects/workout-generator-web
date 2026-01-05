import { describe, it, expect } from 'vitest'
import { getChapterBySlug, getChaptersByOrder, chapters } from '@/data/story/chapters'

describe('chapters data', () => {
  describe('getChapterBySlug', () => {
    it('should return correct chapter when slug exists', () => {
      const chapter = getChapterBySlug('santa-cruz-surfing')

      expect(chapter).toBeDefined()
      expect(chapter?.slug).toBe('santa-cruz-surfing')
      expect(chapter?.title).toBe('Santa Cruz: Surfing and an early relationship with fitness')
      expect(chapter?.order).toBe(1)
    })

    it('should return undefined when slug does not exist', () => {
      const chapter = getChapterBySlug('non-existent-slug')

      expect(chapter).toBeUndefined()
    })

    it('should return correct chapter for different slugs', () => {
      const chapter = getChapterBySlug('tacp')

      expect(chapter).toBeDefined()
      expect(chapter?.slug).toBe('tacp')
      expect(chapter?.title).toBe('TACP: Where fitness becomes readiness')
    })
  })

  describe('getChaptersByOrder', () => {
    it('should return all chapters sorted by order', () => {
      const sortedChapters = getChaptersByOrder()

      expect(sortedChapters).toBeDefined()
      expect(Array.isArray(sortedChapters)).toBe(true)
      expect(sortedChapters.length).toBeGreaterThan(0)

      // Verify chapters are sorted by order
      for (let i = 0; i < sortedChapters.length - 1; i++) {
        expect(sortedChapters[i].order).toBeLessThanOrEqual(sortedChapters[i + 1].order)
      }
    })

    it('should return a new array (not reference to original)', () => {
      const sortedChapters = getChaptersByOrder()

      expect(sortedChapters).not.toBe(chapters)
    })

    it('should have first chapter with order 1', () => {
      const sortedChapters = getChaptersByOrder()

      expect(sortedChapters[0].order).toBe(1)
    })

    it('should return all chapters from the original array', () => {
      const sortedChapters = getChaptersByOrder()

      expect(sortedChapters.length).toBe(chapters.length)
    })
  })
})
