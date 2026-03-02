/**
 * Phase 1 conversion event schema for Reverse Trial Roadmap.
 * Canonical event names and typed helpers for PostHog.
 * Use these for funnel: Onboarding_Complete → signup → Workout_Generated → Workout_Completed → conversion.
 */

import posthog from 'posthog-js'

export const CONVERSION_EVENTS = {
  ONBOARDING_COMPLETE: 'Onboarding_Complete',
  MACGYVER_ENGAGED: 'MacGyver_Engine_Engaged',
  WORKOUT_GENERATED: 'Workout_Generated',
  SET_LOGGED: 'Set_Logged', // App only
  WORKOUT_COMPLETED: 'Workout_Completed', // App only
  ADAPTATION_REQUESTED: 'Adaptation_Requested', // App only
  PAYWALL_VIEWED: 'paywall_viewed',
} as const

export type OnboardingCompleteSource = 'workout_builder' | 'onboarding_wizard'

export interface OnboardingCompleteProps {
  fitness_goals: string[]
  fitness_level: string
  equipment_access: string[]
  activity_level: string
  source: OnboardingCompleteSource
}

export interface MacGyverEngagedProps {
  equipment_count: number
  equipment_categories: string[]
}

/**
 * Fire when user has finished assessment and viewed PlanPreview (MVC).
 * Call from OnboardingWizard and WorkoutPlanBuilder when showing PlanPreview.
 */
export function trackOnboardingComplete(props: OnboardingCompleteProps): void {
  if (typeof window === 'undefined') return
  try {
    if (posthog?.capture) {
      posthog.capture(CONVERSION_EVENTS.ONBOARDING_COMPLETE, {
        fitness_goals: props.fitness_goals,
        fitness_level: props.fitness_level,
        equipment_access: props.equipment_access,
        activity_level: props.activity_level,
        source: props.source,
      })
    }
  } catch {
    // Analytics must not break UX
  }
}

/**
 * Fire once when user has toggled 3+ equipment categories (MacGyver signal).
 * Call from StepOne when equipment count crosses from <3 to >=3.
 */
export function trackMacGyverEngineEngaged(props: MacGyverEngagedProps): void {
  if (typeof window === 'undefined') return
  try {
    if (posthog?.capture) {
      posthog.capture(CONVERSION_EVENTS.MACGYVER_ENGAGED, {
        equipment_count: props.equipment_count,
        equipment_categories: props.equipment_categories,
      })
    }
  } catch {
    // Analytics must not break UX
  }
}
