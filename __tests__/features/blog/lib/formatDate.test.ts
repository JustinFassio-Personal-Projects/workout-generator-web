import { describe, it, expect } from 'vitest'
import { formatDate } from '@/features/blog/lib/formatDate'

describe('formatDate', () => {
  it('should format a date string correctly', () => {
    const result = formatDate('2025-01-15')
    expect(result).toBe('January 15, 2025')
  })

  it('should handle different dates correctly', () => {
    expect(formatDate('2025-12-25')).toBe('December 25, 2025')
    expect(formatDate('2025-03-01')).toBe('March 1, 2025')
    expect(formatDate('2024-07-04')).toBe('July 4, 2024')
  })

  it('should handle single-digit days correctly', () => {
    const result = formatDate('2025-01-05')
    expect(result).toBe('January 5, 2025')
  })

  it('should handle leap year dates', () => {
    const result = formatDate('2024-02-29')
    expect(result).toBe('February 29, 2024')
  })

  it('should use US locale formatting', () => {
    const result = formatDate('2025-01-15')
    // Should be in format "Month Day, Year"
    expect(result).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/)
  })
})
