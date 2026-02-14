import { Suspense } from 'react'
import { headers } from 'next/headers'
import { OnboardingWizard } from '@/components/landing/OnboardingWizard/OnboardingWizard'
import { getTenantByDomainCached } from '@/lib/multi-tenant/tenant-config'

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

export default async function OnboardPage() {
  // Dark mode is applied by layout.tsx script before React hydrates
  // This prevents flash of light mode by ensuring .dark class is present immediately
  // No useEffect needed since layout script handles dark mode application
  // Suspense boundary required because OnboardingWizard uses useSearchParams()
  // which needs runtime context unavailable during static prerendering

  // Extract tenant context from headers (set by proxy)
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-domain')

  // Fetch tenant config only if on a tenant domain (not platform domain)
  // When tenantDomain is null (platform domain), skip database query for performance
  let tenantId: string | undefined
  if (tenantDomain) {
    const tenant = await getTenantByDomainCached(tenantDomain)
    tenantId = tenant?.id
  }

  return (
    <Suspense fallback={<OnboardingWizardFallback />}>
      <OnboardingWizard tenantId={tenantId} />
    </Suspense>
  )
}
