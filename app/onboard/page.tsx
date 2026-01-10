'use client'

import { useEffect } from 'react'
import { OnboardingWizard } from '@/components/landing/OnboardingWizard/OnboardingWizard'

export default function OnboardPage() {
  useEffect(() => {
    // Force dark mode for this page to match fitcopilot-vision aesthetic
    const html = document.documentElement
    const wasDarkMode = html.classList.contains('dark')

    // Always enable dark mode for this onboarding wizard
    html.classList.add('dark')

    // Cleanup: restore original state when leaving
    return () => {
      if (!wasDarkMode) {
        html.classList.remove('dark')
      }
    }
  }, [])

  return <OnboardingWizard />
}
