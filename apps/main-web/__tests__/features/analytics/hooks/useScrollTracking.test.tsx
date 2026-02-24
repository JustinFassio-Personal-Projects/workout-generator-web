import { describe, it, expect } from 'vitest'
import { useScrollTracking } from '@/features/analytics/hooks/useScrollTracking'

describe('useScrollTracking', () => {
  it('should be defined', () => {
    expect(useScrollTracking).toBeDefined()
  })
})
