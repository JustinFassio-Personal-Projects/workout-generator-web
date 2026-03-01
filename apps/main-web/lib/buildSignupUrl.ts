import type { WebsiteOnboardingData } from '@/types/onboarding'

const APP_BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.aiworkoutgenerator.com').replace(
  /\/$/,
  ''
)
const SIGNUP_BASE_URL = `${APP_BASE}/signup`

/**
 * Returns the app base URL (signup/login domain). Configurable via NEXT_PUBLIC_APP_URL.
 */
export const getAppBaseUrl = (): string =>
  (process.env.NEXT_PUBLIC_APP_URL || 'https://app.aiworkoutgenerator.com').replace(/\/$/, '')

/**
 * Builds the signup URL with query parameters from the onboarding data.
 * Parameters are mapped to match the app's expected receiver format.
 * @param data - Onboarding form data
 * @param tenantId - Optional tenant ID for multi-tenant support
 */
export function buildSignupUrl(data: WebsiteOnboardingData, tenantId?: string): string {
  const params = new URLSearchParams()

  // Required fields
  params.set('fitness_level', data.fitness_level)
  params.set('activity_level', data.current_activity_level)
  params.set('fitness_goals', data.fitness_goals.join(','))
  params.set('equipment_access', data.equipment_access.join(',')) // Array of category strings joined with comma

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
  // - mode, view: Redundant signals so app can open Sign Up tab when it reads any of these
  params.set('theme', 'dark')
  params.set('tab', 'signup')
  params.set('mode', 'signup')
  params.set('view', 'signup')

  // Multi-tenant support: Add tenant_id if provided
  if (tenantId) {
    params.set('tenant_id', tenantId)
  }

  return `${SIGNUP_BASE_URL}?${params.toString()}`
}
