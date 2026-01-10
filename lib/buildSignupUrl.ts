import type { WebsiteOnboardingData } from '@/types/onboarding'

const SIGNUP_BASE_URL = 'https://aiworkoutgen.app/signup'

/**
 * Builds the signup URL with query parameters from the onboarding data.
 * Parameters are mapped to match the app's expected receiver format.
 */
export function buildSignupUrl(data: WebsiteOnboardingData): string {
  const params = new URLSearchParams()

  // Required fields
  params.set('fitness_level', data.fitness_level)
  params.set('activity_level', data.current_activity_level)
  params.set('fitness_goals', data.fitness_goals.join(','))
  params.set('equipment_access', data.equipment_access)

  // Unit preferences
  params.set('units_weight', data.preferred_units.weight)
  params.set('units_height', data.preferred_units.height)
  params.set('units_distance', data.preferred_units.distance)
  params.set('units_temperature', data.preferred_units.temperature)

  // Optional fields - only include if provided
  if (data.gender) {
    params.set('gender', data.gender)
  }

  if (data.age !== undefined && data.age !== null) {
    params.set('age', String(data.age))
  }

  // Analytics tracking
  params.set('source', 'website_builder')

  // Theme and UI preferences
  // Note: These parameters are read by the aiworkoutgen.app repo to control:
  // - theme: Forces dark mode to match this website's theme
  // - tab: Sets the initial active tab (signup vs signin)
  params.set('theme', 'dark')
  params.set('tab', 'signup')

  return `${SIGNUP_BASE_URL}?${params.toString()}`
}
