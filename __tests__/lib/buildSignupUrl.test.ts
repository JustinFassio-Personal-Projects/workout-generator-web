import { describe, it, expect } from 'vitest'
import { buildSignupUrl } from '@/lib/buildSignupUrl'
import type { WebsiteOnboardingData } from '@/types/onboarding'

describe('buildSignupUrl', () => {
  it('should build URL with all required fields', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'moderately_active',
      fitness_goals: ['Build muscle', 'Lose fat'],
      equipment_access: 'home',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('https://aiworkoutgen.app/signup?')
    expect(url).toContain('fitness_level=beginner')
    expect(url).toContain('activity_level=moderately_active')
    // URLSearchParams encodes spaces as + and commas as %2C
    expect(url).toContain('fitness_goals=Build+muscle%2CLose+fat')
    expect(url).toContain('equipment_access=home')
    expect(url).toContain('units_weight=lb')
    expect(url).toContain('units_height=in')
    expect(url).toContain('units_distance=mi')
    expect(url).toContain('units_temperature=f')
  })

  it('should include optional gender field when provided', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'intermediate',
      current_activity_level: 'very_active',
      fitness_goals: ['Increase strength'],
      equipment_access: 'full_gym',
      gender: 'male',
      preferred_units: {
        weight: 'kg',
        height: 'cm',
        distance: 'km',
        temperature: 'c',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('gender=male')
  })

  it('should include optional age field when provided', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'advanced',
      current_activity_level: 'extremely_active',
      fitness_goals: ['Improve endurance'],
      equipment_access: 'minimal',
      age: 28,
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('age=28')
  })

  it('should include both optional fields when provided', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'athlete',
      current_activity_level: 'sedentary',
      fitness_goals: ['Improve overall fitness'],
      equipment_access: 'none',
      gender: 'female',
      age: 35,
      preferred_units: {
        weight: 'kg',
        height: 'cm',
        distance: 'km',
        temperature: 'c',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('gender=female')
    expect(url).toContain('age=35')
  })

  it('should not include optional fields when not provided', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'lightly_active',
      fitness_goals: ['Move better / reduce pain'],
      equipment_access: 'home',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).not.toContain('gender=')
    expect(url).not.toContain('age=')
  })

  it('should handle multiple fitness goals correctly', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'intermediate',
      current_activity_level: 'moderately_active',
      fitness_goals: ['Build muscle', 'Lose fat', 'Improve endurance', 'Increase strength'],
      equipment_access: 'full_gym',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    // URLSearchParams encodes spaces as + and commas as %2C
    expect(url).toContain(
      'fitness_goals=Build+muscle%2CLose+fat%2CImprove+endurance%2CIncrease+strength'
    )
  })

  it('should handle all unit preferences correctly', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'sedentary',
      fitness_goals: ['Get back in shape'],
      equipment_access: 'none',
      preferred_units: {
        weight: 'kg',
        height: 'cm',
        distance: 'km',
        temperature: 'c',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('units_weight=kg')
    expect(url).toContain('units_height=cm')
    expect(url).toContain('units_distance=km')
    expect(url).toContain('units_temperature=c')
  })

  it('should handle non-binary gender option', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'intermediate',
      current_activity_level: 'very_active',
      fitness_goals: ['Build muscle'],
      equipment_access: 'home',
      gender: 'non_binary',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('gender=non_binary')
  })

  it('should handle prefer_not_to_say gender option', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'moderately_active',
      fitness_goals: ['Lose fat'],
      equipment_access: 'minimal',
      gender: 'prefer_not_to_say',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('gender=prefer_not_to_say')
  })

  it('should handle age at minimum boundary (13)', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'lightly_active',
      fitness_goals: ['Improve overall fitness'],
      equipment_access: 'none',
      age: 13,
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('age=13')
  })

  it('should handle age at maximum boundary (120)', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'sedentary',
      fitness_goals: ['Move better / reduce pain'],
      equipment_access: 'home',
      age: 120,
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('age=120')
  })

  it('should include source parameter for analytics tracking', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'moderately_active',
      fitness_goals: ['Build muscle'],
      equipment_access: 'home',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    expect(url).toContain('source=website_builder')
  })

  it('should include theme and tab parameters for UI preferences', () => {
    const data: WebsiteOnboardingData = {
      fitness_level: 'beginner',
      current_activity_level: 'moderately_active',
      fitness_goals: ['Build muscle'],
      equipment_access: 'home',
      preferred_units: {
        weight: 'lb',
        height: 'in',
        distance: 'mi',
        temperature: 'f',
      },
    }

    const url = buildSignupUrl(data)
    // Theme should be dark to match this website's theme
    expect(url).toContain('theme=dark')
    // Tab should be signup to open the Sign Up tab by default
    expect(url).toContain('tab=signup')
  })
})
