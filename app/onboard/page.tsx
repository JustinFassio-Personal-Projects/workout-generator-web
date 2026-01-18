'use client'

import { Suspense } from 'react'
import { OnboardingWizard } from '@/components/landing/OnboardingWizard/OnboardingWizard'

// Fallback component for Suspense boundary during prerender
function OnboardingWizardFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-brand-green mx-auto"></div>
        <p className="text-slate-400">Loading workout builder...</p>
      </div>
    </div>
  )
}

export default function OnboardPage() {
  // Dark mode is applied by layout.tsx script before React hydrates
  // This prevents flash of light mode by ensuring .dark class is present immediately
  // No useEffect needed since layout script handles dark mode application
  // Suspense boundary required because OnboardingWizard uses useSearchParams()
  // which needs runtime context unavailable during static prerendering
  return (
    <Suspense fallback={<OnboardingWizardFallback />}>
      <OnboardingWizard />
    </Suspense>
  )
}
