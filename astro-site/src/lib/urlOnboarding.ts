import type { WebsiteOnboardingData, PreferredUnits, EquipmentAccess } from '@/types/onboarding'

export function parseOnboardingFromSearchParams(
  params: URLSearchParams
): Partial<WebsiteOnboardingData> {
  const partial: Partial<WebsiteOnboardingData> = {}
  const fitnessLevel = params.get('fitness_level')
  if (fitnessLevel) partial.fitness_level = fitnessLevel as WebsiteOnboardingData['fitness_level']
  const activityLevel = params.get('activity_level')
  if (activityLevel)
    partial.current_activity_level =
      activityLevel as WebsiteOnboardingData['current_activity_level']
  const goals = params.get('fitness_goals')
  if (goals)
    partial.fitness_goals = goals
      .split(',')
      .filter(Boolean) as WebsiteOnboardingData['fitness_goals']
  const equipment = params.get('equipment_access')
  if (equipment) partial.equipment_access = equipment.split(',').filter(Boolean)
  const gender = params.get('gender')
  if (gender) partial.gender = gender as WebsiteOnboardingData['gender']
  const ageStr = params.get('age')
  if (ageStr) {
    const n = parseInt(ageStr, 10)
    if (!isNaN(n)) partial.age = n
  }
  const weight = params.get('units_weight') as PreferredUnits['weight'] | null
  const height = params.get('units_height') as PreferredUnits['height'] | null
  const distance = params.get('units_distance') as PreferredUnits['distance'] | null
  const temp = params.get('units_temperature') as PreferredUnits['temperature'] | null
  if (weight || height || distance || temp) {
    partial.preferred_units = {
      weight: weight || 'lb',
      height: height || 'in',
      distance: distance || 'mi',
      temperature: temp || 'f',
    }
  }
  return partial
}

export function onboardingToSearchParams(data: WebsiteOnboardingData): string {
  const params = new URLSearchParams()
  params.set('fitness_level', data.fitness_level)
  params.set('activity_level', data.current_activity_level)
  if (data.fitness_goals.length) params.set('fitness_goals', data.fitness_goals.join(','))
  if (data.equipment_access.length) params.set('equipment_access', data.equipment_access.join(','))
  params.set('units_weight', data.preferred_units.weight)
  params.set('units_height', data.preferred_units.height)
  params.set('units_distance', data.preferred_units.distance)
  params.set('units_temperature', data.preferred_units.temperature)
  if (data.gender) params.set('gender', data.gender)
  if (data.age !== undefined && data.age !== null) params.set('age', String(data.age))
  return params.toString()
}

export function equipmentAccessToArray(access: EquipmentAccess): string[] {
  switch (access) {
    case 'none':
      return []
    case 'minimal':
      return ['general', 'strength']
    case 'home':
      return ['general', 'strength', 'functional']
    case 'full_gym':
      return ['general', 'strength', 'functional', 'cardio']
    default:
      return ['general', 'strength']
  }
}

export function equipmentArrayToAccess(categories: string[]): EquipmentAccess {
  if (categories.includes('cardio') && categories.length >= 4) return 'full_gym'
  if (categories.includes('functional') && categories.length >= 3) return 'home'
  if (categories.length >= 2) return 'minimal'
  return 'none'
}
