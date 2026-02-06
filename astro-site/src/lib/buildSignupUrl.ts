import type { WebsiteOnboardingData } from '@/types/onboarding'

const SIGNUP_BASE_URL = 'https://aiworkoutgen.app/signup'

/**
 * Builds the signup URL with query parameters from the onboarding data.
 * Parameters match the aiworkoutgen.app expected format.
 */
export function buildSignupUrl(data: WebsiteOnboardingData, tenantId?: string): string {
  const params = new URLSearchParams()

  params.set('fitness_level', data.fitness_level)
  params.set('activity_level', data.current_activity_level)
  params.set('fitness_goals', data.fitness_goals.join(','))
  params.set('equipment_access', data.equipment_access.join(','))

  params.set('units_weight', data.preferred_units.weight)
  params.set('units_height', data.preferred_units.height)
  params.set('units_distance', data.preferred_units.distance)
  params.set('units_temperature', data.preferred_units.temperature)

  if (data.gender) params.set('gender', data.gender)
  if (data.age !== undefined && data.age !== null) params.set('age', String(data.age))

  params.set('source', 'website_builder')
  params.set('theme', 'dark')
  params.set('tab', 'signup')
  params.set('mode', 'signup')
  params.set('view', 'signup')
  if (tenantId) params.set('tenant_id', tenantId)

  return `${SIGNUP_BASE_URL}?${params.toString()}`
}
