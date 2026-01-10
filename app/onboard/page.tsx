'use client'

import { OnboardingWizard } from '@/components/landing/OnboardingWizard/OnboardingWizard'

export default function OnboardPage() {
  // Dark mode is applied by layout.tsx script before React hydrates
  // This prevents flash of light mode by ensuring .dark class is present immediately
  // No useEffect needed since layout script handles dark mode application
  return <OnboardingWizard />
}
