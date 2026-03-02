import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAllPublishedDeepResearch,
  getAllPublishedSlugs,
  getDeepResearchBySlug,
} from '@/lib/deep-research/queries'

const mockDeepResearchItem = {
  id: 'dr-1',
  slug: 'test-article',
  title: 'Test Article',
  excerpt: 'Test excerpt',
  html_content: '<p>Content</p>',
  seo_title: null,
  seo_description: null,
  status: 'published',
  published_at: '2025-01-15T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
}

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: vi.fn(),
}))

describe('deep-research queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createPublicClient } = await import('@/lib/supabase/public')
    vi.mocked(createPublicClient).mockReturnValue(null)
  })

  describe('getAllPublishedDeepResearch', () => {
    it('should return empty array when createPublicClient returns null', async () => {
      const result = await getAllPublishedDeepResearch()
      expect(result).toEqual([])
    })

    it('should return items when Supabase returns data', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [mockDeepResearchItem], error: null })),
            })),
          })),
        })),
      } as never)

      const result = await getAllPublishedDeepResearch()
      expect(result).toEqual([mockDeepResearchItem])
    })

    it('should return empty array when Supabase returns error', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } })),
            })),
          })),
        })),
      } as never)

      const result = await getAllPublishedDeepResearch()
      expect(result).toEqual([])
    })
  })

  describe('getAllPublishedSlugs', () => {
    it('should return empty array when createPublicClient returns null', async () => {
      const result = await getAllPublishedSlugs()
      expect(result).toEqual([])
    })

    it('should return slugs when Supabase returns data', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ slug: 'a' }, { slug: 'b' }], error: null })),
          })),
        })),
      } as never)

      const result = await getAllPublishedSlugs()
      expect(result).toEqual(['a', 'b'])
    })

    it('should return empty array when Supabase returns error', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: {} })),
          })),
        })),
      } as never)

      const result = await getAllPublishedSlugs()
      expect(result).toEqual([])
    })
  })

  describe('getDeepResearchBySlug', () => {
    it('should return null when createPublicClient returns null', async () => {
      const result = await getDeepResearchBySlug('some-slug')
      expect(result).toBeNull()
    })

    it('should return item when found', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockDeepResearchItem, error: null })),
              })),
            })),
          })),
        })),
      } as never)

      const result = await getDeepResearchBySlug('test-article')
      expect(result).toEqual(mockDeepResearchItem)
    })

    it('should return null when not found or error', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
              })),
            })),
          })),
        })),
      } as never)

      const result = await getDeepResearchBySlug('nonexistent')
      expect(result).toBeNull()
    })
  })
})
