import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantByDomainCached } from '@/lib/multi-tenant/tenant-config'

// For tracer bullet: Hardcoded tenant data (fallback when Supabase not available)
const MOCK_TENANTS: Record<string, { id?: string; name: string; primary_color: string }> = {
  'client-a.localhost': {
    name: 'Iron Gym',
    primary_color: '#ff0000',
  },
  'client-b.localhost': {
    name: 'FitZone',
    primary_color: '#0066cc',
  },
}

export default async function TenantPage({ params }: { params: { domain: string } }) {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-domain') || params.domain

  // Try to get tenant from Supabase (Phase 3), fallback to mock data (tracer bullet)
  let tenant = await getTenantByDomainCached(tenantDomain)

  // Fallback to mock data if Supabase query fails or tenant not found
  if (!tenant) {
    const mockTenant = MOCK_TENANTS[tenantDomain]
    if (mockTenant) {
      tenant = {
        id: mockTenant.id || tenantDomain,
        domain: tenantDomain,
        name: mockTenant.name,
        primary_color: mockTenant.primary_color,
        settings: {},
      }
    }
  }

  if (!tenant) {
    notFound() // Will render not-found.tsx
  }

  // Use tenant_id if available (Supabase), otherwise use domain (mock data)
  const tenantIdentifier = tenant.id || tenantDomain

  // Firebase app base URL for the workout application.
  // In local development this should be http://localhost:3000, and in production it
  // should point at the deployed Firebase app domain (e.g. https://aiworkoutgen.app).
  // We default to localhost to keep the tracer bullet working if the env var is missing.
  const firebaseAppBaseUrl = process.env.NEXT_PUBLIC_FIREBASE_APP_URL || 'http://localhost:3000'

  return (
    <div style={{ padding: 40, color: tenant.primary_color }}>
      <h1>Welcome to {tenant.name}</h1>
      <p>This is the SEO-optimized marketing site for {tenant.name}.</p>
      <p>Domain: {tenantDomain}</p>

      {/* THE HANDSHAKE: Link to Firebase App */}
      {/* Pass tenant_id if available (from Supabase), otherwise pass domain (mock data) */}
      <Link
        href={`${firebaseAppBaseUrl}/login?tenant_id=${tenantIdentifier}`}
        style={{
          background: tenant.primary_color,
          color: 'white',
          padding: '10px 20px',
          borderRadius: '4px',
          display: 'inline-block',
          marginTop: '20px',
        }}
      >
        Launch Workout App
      </Link>
    </div>
  )
}
