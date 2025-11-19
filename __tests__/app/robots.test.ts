import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'

describe('robots.ts', () => {
  it('should return robots configuration', () => {
    const result = robots()

    expect(result).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: [],
      },
      sitemap: expect.stringContaining('/sitemap.xml'),
    })
  })

  it('should include sitemap URL', () => {
    const result = robots()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

    expect(result.sitemap).toBe(`${baseUrl}/sitemap.xml`)
  })
})
