/**
 * Builds a wizard URL with equipment preselect parameters.
 * Maps equipment types to URL structure for future wizard implementation.
 *
 * @param equipmentType - The equipment type to preselect (e.g., 'dumbbells', 'kettlebells', or any equipment ID)
 * @returns The wizard URL with preselect parameter
 */
export function buildEquipmentWizardUrl(equipmentType: string): string {
  const baseUrl = '/onboard'
  const params = new URLSearchParams()
  params.set('preselect', equipmentType)
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
