/**
 * Builds a wizard URL with equipment preselect parameters.
 * Maps equipment types to URL structure for future wizard implementation.
 *
 * @param equipmentTypes - Single equipment type or array of types to preselect (e.g., 'dumbbells' or ['dumbbells', 'kettlebells'])
 * @returns The wizard URL with preselect parameter(s)
 */
export function buildEquipmentWizardUrl(equipmentTypes: string | string[]): string {
  const baseUrl = '/onboard'
  const params = new URLSearchParams()
  const values = Array.isArray(equipmentTypes) ? equipmentTypes : [equipmentTypes]
  values.forEach(value => params.append('preselect', value))
  return `${baseUrl}?${params.toString()}`
}

/**
 * Equipment type mappings for consistent URL generation
 */
export const EQUIPMENT_TYPES = {
  DUMBBELLS: 'dumbbells',
  KETTLEBELLS: 'kettlebells',
  BARBELL: 'barbell',
  BANDS: 'bands',
  MACHINES: 'machines',
  BODYWEIGHT: 'bodyweight',
} as const
