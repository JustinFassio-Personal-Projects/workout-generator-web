import { describe, it, expect } from 'vitest'
import { buildEquipmentWizardUrl, EQUIPMENT_TYPES } from '@/lib/buildEquipmentWizardUrl'

describe('buildEquipmentWizardUrl', () => {
  it('should build URL with preselect parameter', () => {
    const url = buildEquipmentWizardUrl('dumbbells')
    expect(url).toBe('/onboard?preselect=dumbbells')
  })

  it('should handle different equipment types', () => {
    expect(buildEquipmentWizardUrl(EQUIPMENT_TYPES.DUMBBELLS)).toBe('/onboard?preselect=dumbbells')
    expect(buildEquipmentWizardUrl(EQUIPMENT_TYPES.KETTLEBELLS)).toBe(
      '/onboard?preselect=kettlebells'
    )
    expect(buildEquipmentWizardUrl(EQUIPMENT_TYPES.BODYWEIGHT)).toBe(
      '/onboard?preselect=bodyweight'
    )
  })

  it('should URL-encode special characters in equipment type', () => {
    const url = buildEquipmentWizardUrl('resistance bands')
    expect(url).toBe('/onboard?preselect=resistance+bands')
  })

  it('should build URL with multiple preselect parameters', () => {
    const url = buildEquipmentWizardUrl(['dumbbells', 'kettlebells'])
    expect(url).toBe('/onboard?preselect=dumbbells&preselect=kettlebells')
  })

  it('should handle single-item array the same as single string', () => {
    expect(buildEquipmentWizardUrl(['dumbbells'])).toBe(buildEquipmentWizardUrl('dumbbells'))
  })
})
