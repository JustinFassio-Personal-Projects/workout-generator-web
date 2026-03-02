import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCapture = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}))

import {
  CONVERSION_EVENTS,
  trackOnboardingComplete,
  trackMacGyverEngineEngaged,
} from '@/lib/conversion-events'

describe('conversion-events', () => {
  beforeEach(() => {
    mockCapture.mockClear()
  })

  describe('CONVERSION_EVENTS', () => {
    it('exposes canonical event names', () => {
      expect(CONVERSION_EVENTS.ONBOARDING_COMPLETE).toBe('Onboarding_Complete')
      expect(CONVERSION_EVENTS.MACGYVER_ENGAGED).toBe('MacGyver_Engine_Engaged')
      expect(CONVERSION_EVENTS.WORKOUT_GENERATED).toBe('Workout_Generated')
      expect(CONVERSION_EVENTS.PAYWALL_VIEWED).toBe('paywall_viewed')
    })
  })

  describe('trackOnboardingComplete', () => {
    it('calls posthog.capture with Onboarding_Complete and props', () => {
      trackOnboardingComplete({
        fitness_goals: ['hypertrophy', 'strength'],
        fitness_level: 'intermediate',
        equipment_access: ['general', 'strength', 'functional'],
        activity_level: 'moderate',
        source: 'onboarding_wizard',
      })

      expect(mockCapture).toHaveBeenCalledTimes(1)
      expect(mockCapture).toHaveBeenCalledWith(CONVERSION_EVENTS.ONBOARDING_COMPLETE, {
        fitness_goals: ['hypertrophy', 'strength'],
        fitness_level: 'intermediate',
        equipment_access: ['general', 'strength', 'functional'],
        activity_level: 'moderate',
        source: 'onboarding_wizard',
      })
    })

    it('accepts workout_builder as source', () => {
      trackOnboardingComplete({
        fitness_goals: ['fat_loss'],
        fitness_level: 'beginner',
        equipment_access: ['general'],
        activity_level: 'low',
        source: 'workout_builder',
      })

      expect(mockCapture).toHaveBeenCalledWith(
        CONVERSION_EVENTS.ONBOARDING_COMPLETE,
        expect.objectContaining({ source: 'workout_builder' })
      )
    })
  })

  describe('trackMacGyverEngineEngaged', () => {
    it('calls posthog.capture with MacGyver_Engine_Engaged and props', () => {
      trackMacGyverEngineEngaged({
        equipment_count: 3,
        equipment_categories: ['general', 'strength', 'functional'],
      })

      expect(mockCapture).toHaveBeenCalledTimes(1)
      expect(mockCapture).toHaveBeenCalledWith(CONVERSION_EVENTS.MACGYVER_ENGAGED, {
        equipment_count: 3,
        equipment_categories: ['general', 'strength', 'functional'],
      })
    })
  })
})
