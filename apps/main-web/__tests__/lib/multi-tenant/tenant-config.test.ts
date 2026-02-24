import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTenantByDomain, getTenantByDomainCached } from '@/lib/multi-tenant/tenant-config'

const mockTenantData = {
  id: 'tenant-1',
  domain: 'example.com',
  name: 'Example Tenant',
  logo_url: '/logo.png',
  favicon_url: '/favicon.ico',
  primary_color: '#0066cc',
  secondary_color: '#ff6600',
  custom_css: '.custom {}',
  settings: { feature: true },
}

vi.mock('@/lib/supabase/public', () => ({
  createPublicClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: () => Promise<unknown>) => () => fn()),
}))

describe('tenant-config', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { createPublicClient } = await import('@/lib/supabase/public')
    vi.mocked(createPublicClient).mockReturnValue(null)
  })

  describe('getTenantByDomain', () => {
    it('should return null when createPublicClient returns null', async () => {
      const result = await getTenantByDomain('example.com')
      expect(result).toBeNull()
    })

    it('should return null when Supabase returns error', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({ data: null, error: { message: 'Not found' } })
                ),
              })),
            })),
          })),
        })),
      } as never)

      const result = await getTenantByDomain('example.com')
      expect(result).toBeNull()
    })

    it('should return tenant config when found', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockTenantData, error: null })),
              })),
            })),
          })),
        })),
      } as never)

      const result = await getTenantByDomain('example.com')
      expect(result).toEqual({
        id: mockTenantData.id,
        domain: mockTenantData.domain,
        name: mockTenantData.name,
        logo_url: mockTenantData.logo_url,
        favicon_url: mockTenantData.favicon_url,
        primary_color: mockTenantData.primary_color,
        secondary_color: mockTenantData.secondary_color,
        custom_css: mockTenantData.custom_css,
        settings: mockTenantData.settings,
      })
    })

    it('should default settings to empty object when null', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      const dataWithoutSettings = { ...mockTenantData, settings: null }
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: dataWithoutSettings, error: null })),
              })),
            })),
          })),
        })),
      } as never)

      const result = await getTenantByDomain('example.com')
      expect(result?.settings).toEqual({})
    })
  })

  describe('getTenantByDomainCached', () => {
    it('should return cached result from getTenantByDomain', async () => {
      const { createPublicClient } = await import('@/lib/supabase/public')
      vi.mocked(createPublicClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockTenantData, error: null })),
              })),
            })),
          })),
        })),
      } as never)

      const result = await getTenantByDomainCached('example.com')
      expect(result).toEqual({
        id: mockTenantData.id,
        domain: mockTenantData.domain,
        name: mockTenantData.name,
        logo_url: mockTenantData.logo_url,
        favicon_url: mockTenantData.favicon_url,
        primary_color: mockTenantData.primary_color,
        secondary_color: mockTenantData.secondary_color,
        custom_css: mockTenantData.custom_css,
        settings: mockTenantData.settings,
      })
    })
  })
})
