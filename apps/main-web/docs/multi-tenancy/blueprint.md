# Multi-Tenancy Blueprint

## Overview

This document outlines the architecture and implementation strategy for transforming the Workout Generator application into a multi-tenant platform. The platform will enable multiple client websites (e.g., `client-a.com`, `client-b.com`) to be served from a single codebase with a centralized Admin Dashboard.

## Architecture Principles

### Core Concept

Multi-tenancy in Next.js relies on **Middleware** to serve different content based on the domain name, while maintaining a single deployment and codebase. Each tenant's website is dynamically rendered based on their domain, with tenant-specific branding, content, and data.

This blueprint follows the **Vercel Platforms Starter Kit** architecture pattern, which is widely considered the gold standard for Next.js multi-tenancy implementations.

### Architectural Strengths

This design leverages several proven patterns:

1. **Supabase Row-Level Security (RLS)**: The MVP of the security layer. RLS policies enforce `tenant_id` filtering at the database engine level, preventing accidental data leaks even if application code forgets a `WHERE` clause. This is defense-in-depth at its finest.

2. **Header Injection Pattern**: Passing `x-tenant-domain` via middleware headers is the correct way to get tenant context into Server Components without prop drilling. This maintains clean component APIs while providing necessary context.

3. **Clean Directory Separation**: The split between `/app/admin` and `/app/sites` creates clear boundaries, making the codebase scalable and maintainable as the platform grows.

### Key Benefits

- **Unified Codebase**: Update once, deploy everywhere
- **Reduced Infrastructure Costs**: Single server/instance serves all tenants
- **Simplified Maintenance**: Centralized bug fixes and feature updates
- **Scalability**: Easy to onboard new tenants without additional deployments
- **Consistent Experience**: All tenants benefit from platform improvements

### Trade-offs

- **Data Isolation**: Logical separation requires careful implementation to prevent data leakage
- **Complexity**: Middleware and routing logic become more sophisticated
- **Performance**: All tenants share the same infrastructure resources
- **Customization Limits**: Tenants are constrained to platform-supported features

---

## Architecture Flow

### Request Flow Visualization

The architecture handles two distinct request paths:

#### Path 1: Admin Dashboard Request

```
User → admin.myplatform.com/dashboard
   ↓
Middleware: Detects admin domain
   ↓
Rewrite: /admin/dashboard
   ↓
Render: /app/admin/dashboard/page.tsx
   ├─ Auth: Supabase session on root domain
   ├─ Context: Global admin access
   └─ Data: All tenants (filtered by admin permissions)
```

#### Path 2: Tenant Site Request

```
User → client-a.com/about
   ↓
Middleware: Detects tenant domain (optimistic rewrite)
   ↓
Rewrite: /sites/client-a.com/about
   ├─ NO database query in middleware (performance critical)
   └─ Header injected: x-tenant-domain = "client-a.com"
   ↓
Render: /app/sites/[domain]/layout.tsx
   ├─ Fetch tenant config (cached, non-blocking)
   ├─ Apply tenant branding
   └─ Render: /app/sites/[domain]/[...slug]/page.tsx
       ├─ Auth: Supabase session on tenant domain
       ├─ Context: Tenant-scoped data access
       └─ Data: Only tenant's content (RLS enforced)
```

### Domain Structure

```
admin.myplatform.com     → Admin Dashboard (/admin routes)
myplatform.com           → Main marketing site (existing homepage)
client-a.com             → Tenant Site A (/sites/client-a.com routes)
client-b.com             → Tenant Site B (/sites/client-b.com routes)
client-c.vercel.app      → Tenant Site C preview (/sites/client-c.vercel.app routes)
```

### Critical Architecture Decision: Optimistic Rewrites

**⚠️ Performance Warning:** Middleware runs on the Edge and executes on every request. Performing database queries in middleware adds 300-500ms latency to every page load, violating performance targets.

**Solution:** Use optimistic rewrites - rewrite all custom domains to `/sites/[domain]` without verification. Handle tenant validation and 404s in the page component where rendering can be cached.

---

## Directory Structure

### Proposed File Organization

```
/app
 ├── /admin                    # Existing Admin Panel
 │    ├── page.tsx
 │    ├── dashboard/
 │    └── sites/               # NEW: Tenant management UI
 │         ├── page.tsx        # List all tenants
 │         ├── [domain]/
 │         │    ├── page.tsx   # Tenant settings
 │         │    └── settings/
 │         └── new/
 │              └── page.tsx   # Create new tenant
 │
 ├── /sites                    # NEW: Multi-tenant site template
 │    └── [domain]/            # Dynamic segment captures hostname
 │         ├── layout.tsx      # Tenant-specific layout (branding)
 │         └── [...slug]/      # Catch-all for all pages
 │              ├── page.tsx   # Dynamic page renderer
 │              ├── about/
 │              │    └── page.tsx
 │              ├── blog/
 │              │    ├── page.tsx
 │              │    └── [slug]/
 │              │         └── page.tsx
 │              └── contact/
 │                   └── page.tsx
 │
 ├── /api
 │    ├── /admin
 │    │    └── /sites          # NEW: Tenant management API
 │    │         ├── route.ts   # List/create tenants
 │    │         └── [domain]/
 │    │              ├── route.ts    # Get/update/delete tenant
 │    │              ├── settings/
 │    │              │    └── route.ts
 │    │              └── domains/
 │    │                   └── route.ts
 │    │
 │    └── /sites               # NEW: Tenant-specific API routes
 │         └── [domain]/
 │              ├── /content/
 │              └── /analytics/
 │
 ├── middleware.ts             # NEW: Traffic controller
 └── layout.tsx                # Root layout (unchanged)

/components
 ├── /admin
 │    └── /sites               # NEW: Tenant management components
 │         ├── TenantList.tsx
 │         ├── TenantForm.tsx
 │         ├── DomainManager.tsx
 │         └── BrandingEditor.tsx
 │
 ├── /sites                    # NEW: Tenant site components
 │    └── /[domain]/
 │         ├── SiteHeader.tsx
 │         ├── SiteFooter.tsx
 │         └── SiteLayout.tsx

/lib
 ├── /multi-tenant             # NEW: Multi-tenancy utilities
 │    ├── middleware.ts        # Middleware helpers
 │    ├── tenant-config.ts     # Tenant configuration utilities
 │    └── data-isolation.ts    # Data isolation helpers
 │
 └── /supabase
      └── /multi-tenant        # NEW: Tenant-aware Supabase helpers
           └── client.ts
```

---

## Core Implementation

### 1. Middleware (`middleware.ts`)

The middleware is the traffic controller that intercepts all requests and routes them to the appropriate tenant or admin interface.

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || 'admin.myplatform.com'
const PLATFORM_DOMAINS = [
  'myplatform.com',
  'www.myplatform.com',
  process.env.VERCEL_URL, // Development preview
].filter(Boolean)

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''

  // Normalize hostname (remove port, www, etc.)
  const normalizedHost = normalizeHostname(hostname)

  // 1. Admin domain → /admin routes
  if (normalizedHost === ADMIN_DOMAIN || normalizedHost === `www.${ADMIN_DOMAIN}`) {
    // Rewrite admin domain to /admin routes
    if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api')) {
      url.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // 2. Platform domains → Main marketing site (current homepage)
  if (PLATFORM_DOMAINS.includes(normalizedHost)) {
    return NextResponse.next() // Serve existing homepage
  }

  // 3. Tenant domains → /sites/[domain] routes
  // OPTIMISTIC REWRITE: No database query here (performance critical)
  // Tenant validation happens in page component where it can be cached
  const tenantDomain = normalizedHost

  // Rewrite tenant domain to /sites/[domain] routes
  url.pathname = `/sites/${tenantDomain}${url.pathname === '/' ? '' : url.pathname}`

  // Add tenant context to headers for use in server components
  const response = NextResponse.rewrite(url)
  response.headers.set('x-tenant-domain', tenantDomain)

  return response
}

function normalizeHostname(hostname: string): string {
  // Remove port if present
  const withoutPort = hostname.split(':')[0]

  // Remove www prefix
  const withoutWww = withoutPort.replace(/^www\./, '')

  return withoutWww.toLowerCase()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
```

### 2. Database Schema

#### Tenant Management Tables

```sql
-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Branding
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  custom_css TEXT,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tenant domains (support multiple domains per tenant)
CREATE TABLE tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, domain)
);

-- Row Level Security (RLS) for tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Add tenant_id to existing tables
ALTER TABLE blog_posts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_tenant_id_check
  CHECK (tenant_id IS NOT NULL); -- Enforce tenant isolation

-- Create indexes for tenant filtering
CREATE INDEX idx_blog_posts_tenant_id ON blog_posts(tenant_id);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenant_domains_domain ON tenant_domains(domain);
```

#### Multi-Tenant Data Isolation

All existing tables that contain tenant-specific data must include a `tenant_id` column:

- `blog_posts` → `tenant_id`
- `analytics_events` → `tenant_id` (optional, or use domain-based filtering)
- `leads` → `tenant_id`
- Custom content tables → `tenant_id`

### 3. Tenant Configuration Utilities

```typescript
// lib/multi-tenant/tenant-config.ts
import { createServerClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

export interface TenantConfig {
  id: string
  domain: string
  name: string
  logo_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  custom_css?: string
  settings: Record<string, unknown>
}

export async function getTenantByDomain(domain: string): Promise<TenantConfig | null> {
  const supabase = createServerClient()

  // First check tenant_domains table
  const { data: tenantDomain } = await supabase
    .from('tenant_domains')
    .select('tenant_id')
    .eq('domain', domain)
    .single()

  if (!tenantDomain) {
    // Fallback: check tenants table directly
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain', domain)
      .eq('status', 'active')
      .single()

    if (!tenant) return null

    return {
      id: tenant.id,
      domain: tenant.domain,
      name: tenant.name,
      logo_url: tenant.logo_url,
      favicon_url: tenant.favicon_url,
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      custom_css: tenant.custom_css,
      settings: tenant.settings || {},
    }
  }

  // Fetch tenant by ID from tenant_domains lookup
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantDomain.tenant_id)
    .eq('status', 'active')
    .single()

  if (!tenant) return null

  return {
    id: tenant.id,
    domain: tenant.domain,
    name: tenant.name,
    logo_url: tenant.logo_url,
    favicon_url: tenant.favicon_url,
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
    custom_css: tenant.custom_css,
    settings: tenant.settings || {},
  }
}

export function getTenantDomainFromRequest(request: NextRequest): string | null {
  const hostname = request.headers.get('host')
  if (!hostname) return null

  // Normalize hostname (remove port, www, etc.)
  const normalized = hostname
    .split(':')[0] // Remove port
    .replace(/^www\./, '') // Remove www
    .toLowerCase()

  return normalized
}
```

### 4. Tenant Site Layout

```typescript
// app/sites/[domain]/layout.tsx
import { notFound } from 'next/navigation'
import { getTenantByDomain } from '@/lib/multi-tenant/tenant-config'
import { headers } from 'next/headers'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { domain: string }
}) {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-domain') || params.domain

  const tenant = await getTenantByDomain(tenantDomain)

  if (!tenant) {
    notFound()
  }

  return (
    <html lang="en">
      <head>
        {tenant.favicon_url && (
          <link rel="icon" href={tenant.favicon_url} />
        )}
        {tenant.custom_css && (
          <style dangerouslySetInnerHTML={{ __html: tenant.custom_css }} />
        )}
        {tenant.primary_color && (
          <style>{`
            :root {
              --brand-primary: ${tenant.primary_color};
              --brand-secondary: ${tenant.secondary_color || tenant.primary_color};
            }
          `}</style>
        )}
      </head>
      <body>
        <TenantHeader tenant={tenant} />
        {children}
        <TenantFooter tenant={tenant} />
      </body>
    </html>
  )
}
```

### 5. Data Isolation Helpers

```typescript
// lib/multi-tenant/data-isolation.ts
import { createServerClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { getTenantDomainFromRequest } from './tenant-config'

/**
 * Creates a tenant-aware Supabase client that automatically filters
 * queries by tenant_id to ensure data isolation
 */
export async function createTenantAwareClient(request: NextRequest) {
  const supabase = createServerClient()
  const tenantDomain = getTenantDomainFromRequest(request)

  if (!tenantDomain) {
    throw new Error('Tenant domain not found in request')
  }

  // Fetch tenant ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('domain', tenantDomain)
    .single()

  if (!tenant) {
    throw new Error(`Tenant not found for domain: ${tenantDomain}`)
  }

  // Return a client factory that adds tenant_id to queries
  return {
    tenant_id: tenant.id,
    supabase,
    // Helper to ensure tenant_id is always included
    withTenantId: <T extends { tenant_id?: string }>(data: T): T & { tenant_id: string } => ({
      ...data,
      tenant_id: tenant.id,
    }),
  }
}

/**
 * Middleware helper to ensure all queries include tenant_id
 */
export function assertTenantIsolation(query: any, tenant_id: string): void {
  if (query.tenant_id && query.tenant_id !== tenant_id) {
    throw new Error('Tenant ID mismatch - potential data leakage detected')
  }
}
```

---

## Authentication & Session Scope

### Critical Architecture Decision

**The Problem:** Supabase Auth cookies are domain-scoped. A user logged into `client-a.com` cannot access `admin.myplatform.com` with the same session, and vice versa.

### Auth Strategy: Tenant-Isolated (Recommended)

**Decision:** Users sign up and authenticate within a specific tenant's domain. They cannot access other tenants or the admin dashboard.

**Implementation:**

1. **Tenant Users:**
   - Sign up/login on `client-a.com`
   - Supabase Auth cookie set for `client-a.com` domain
   - Session scoped to that tenant only
   - RLS policies enforce tenant isolation at database level

2. **Admin Users:**
   - Sign up/login on `admin.myplatform.com` or `myplatform.com`
   - Supabase Auth cookie set for root domain
   - Session provides access to admin dashboard
   - Can manage all tenants (via admin_users table)

### Cookie Configuration

```typescript
// lib/supabase/tenant-client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createTenantSupabaseClient(domain: string) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Cookies are automatically scoped to current domain
          return getCookie(name)
        },
        set(name: string, value: string, options: CookieOptions) {
          // Cookie domain is automatically set to current hostname
          setCookie(name, value, {
            ...options,
            domain: domain, // Explicitly set for tenant domains
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        },
        remove(name: string, options: CookieOptions) {
          setCookie(name, '', {
            ...options,
            domain: domain,
            maxAge: 0,
          })
        },
      },
    }
  )
}
```

### Alternative: Unified Auth (Not Recommended)

**Unified Auth** allows one global account to access multiple tenants. This is significantly more complex:

- Requires custom session management
- Complex permission system (which tenants can user access?)
- Higher security risk (broader attack surface)
- More difficult to implement data isolation

**Recommendation:** Start with Tenant-Isolated auth. If unified auth becomes a business requirement, implement it as Phase 2.

### Auth Flow Diagram

```
Tenant User Flow:
client-a.com/login
  ↓
Supabase Auth (domain: client-a.com)
  ↓
Cookie: sb-{project}-auth-token (domain: client-a.com)
  ↓
Access: Only client-a.com content (RLS enforced)

Admin User Flow:
admin.myplatform.com/login
  ↓
Supabase Auth (domain: myplatform.com)
  ↓
Cookie: sb-{project}-auth-token (domain: myplatform.com)
  ↓
Access: Admin dashboard (all tenants, via admin_users table)
```

---

## Static Generation & Caching Strategy

### The Problem

Fetching tenant configuration on every request is inefficient for content-heavy sites (blogs, about pages). This adds latency and increases database load.

### Solution: Incremental Static Regeneration (ISR)

Use Next.js ISR to pre-generate static pages for active tenants, with on-demand revalidation when tenant settings change.

### Implementation

```typescript
// app/sites/[domain]/page.tsx
import { getAllActiveTenants } from '@/lib/multi-tenant/tenant-config'

// Generate static params for all active tenants at build time
export async function generateStaticParams() {
  const tenants = await getAllActiveTenants()

  return tenants.map((tenant) => ({
    domain: tenant.domain,
  }))
}

// Revalidate on-demand (when tenant settings change)
export const revalidate = 3600 // Revalidate every hour, or use on-demand

export default async function TenantPage({
  params,
}: {
  params: { domain: string }
}) {
  const tenant = await getTenantByDomain(params.domain)

  if (!tenant) {
    notFound() // Handle 404 for invalid tenants
  }

  // Render tenant-specific content
  return <TenantHomePage tenant={tenant} />
}
```

### Caching Strategy

1. **Tenant Config Cache:**

   ```typescript
   // lib/multi-tenant/tenant-config.ts
   import { unstable_cache } from 'next/cache'

   export const getTenantByDomainCached = unstable_cache(
     async (domain: string) => {
       return getTenantByDomain(domain)
     },
     ['tenant-config'],
     {
       revalidate: 300, // 5 minutes
       tags: [`tenant-${domain}`], // Tag for on-demand revalidation
     }
   )
   ```

2. **On-Demand Revalidation:**

   ```typescript
   // app/api/admin/sites/[domain]/route.ts
   import { revalidateTag } from 'next/cache'

   export async function PATCH(request: NextRequest, { params }: { params: { domain: string } }) {
     // Update tenant in database
     await updateTenant(params.domain, data)

     // Revalidate cached tenant config
     revalidateTag(`tenant-${params.domain}`)

     return NextResponse.json({ success: true })
   }
   ```

3. **Edge Config Alternative (Advanced):**
   For ultra-low latency, use Vercel Edge Config or Upstash Redis to store tenant domain mappings:

   ```typescript
   // middleware.ts (if using Edge Config)
   import { get } from '@vercel/edge-config'

   const tenantId = await get(`tenant:${normalizedHost}`)
   if (tenantId) {
     // Tenant exists, proceed with rewrite
   }
   ```

---

## Domain Verification & SSL Management

### The Challenge

When a tenant wants to connect their custom domain (e.g., `gym.mybrand.com`), you must verify they own it before serving content. This requires DNS verification and SSL certificate provisioning.

### Verification Process

#### Step 1: DNS Verification

```typescript
// lib/multi-tenant/domain-verification.ts
import dns from 'dns/promises'

export async function verifyDomainOwnership(domain: string): Promise<boolean> {
  // Option 1: CNAME Verification
  // Tenant must add: gym.mybrand.com CNAME → platform.myplatform.com
  try {
    const records = await dns.resolveCname(domain)
    return records.some(record => record.includes('myplatform.com'))
  } catch {
    return false
  }

  // Option 2: TXT Record Verification
  // Tenant must add: _verification.mybrand.com TXT → "unique-verification-code"
  try {
    const records = await dns.resolveTxt(`_verification.${domain}`)
    const verificationCode = await getVerificationCode(domain)
    return records.some(record => record.includes(verificationCode))
  } catch {
    return false
  }
}
```

#### Step 2: SSL Certificate Provisioning

**Vercel (Recommended):**

```typescript
// app/api/admin/sites/[domain]/domains/route.ts
import { VercelClient } from '@vercel/client'

const vercel = new VercelClient({
  token: process.env.VERCEL_TOKEN,
})

export async function POST(request: NextRequest, { params }: { params: { domain: string } }) {
  const { domain } = await request.json()

  // Verify domain ownership first
  const isVerified = await verifyDomainOwnership(domain)
  if (!isVerified) {
    return NextResponse.json({ error: 'Domain ownership not verified' }, { status: 400 })
  }

  // Add domain to Vercel project
  const result = await vercel.domains.create({
    name: domain,
    projectId: process.env.VERCEL_PROJECT_ID,
  })

  // Vercel automatically provisions SSL via Let's Encrypt
  // Update tenant_domains table
  await supabase.from('tenant_domains').insert({
    tenant_id: params.domain,
    domain: domain,
    verified: true,
  })

  return NextResponse.json({ success: true, domain: result })
}
```

**Self-Hosted (Alternative):**

- Use cert-manager with Let's Encrypt
- Configure Nginx/Caddy reverse proxy
- Automate DNS-01 challenge validation

### Tenant Settings UI Integration

The domain verification flow should be integrated into the tenant settings UI:

1. **Add Domain Form** (`/admin/sites/[domain]/domains`)
   - Input field for custom domain
   - Instructions for DNS setup (CNAME or TXT record)
   - "Verify Domain" button

2. **Verification Status**
   - Show pending/verified/failed status
   - Display DNS instructions if pending
   - Show SSL certificate status

3. **Automated Verification**
   - Background job checks DNS every 5 minutes
   - Updates `verified` status automatically
   - Sends notification when verified

---

## Admin Dashboard Integration

### Tenant Management UI

The existing admin dashboard should be extended to support tenant management:

1. **Tenant List** (`/admin/sites`)
   - Table view of all tenants
   - Filter by status, domain, creation date
   - Quick actions: Edit, Suspend, Delete

2. **Tenant Settings** (`/admin/sites/[domain]`)
   - General settings (name, domain, status)
   - Branding (logo, colors, custom CSS)
   - Domain management (add/remove domains)
   - Analytics overview

3. **Create Tenant** (`/admin/sites/new`)
   - Form to create new tenant
   - Domain validation
   - Initial branding setup

### API Routes

```typescript
// app/api/admin/sites/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/sites - List all tenants
export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  // Verify admin access (existing pattern)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ tenants })
}

// POST /api/admin/sites - Create new tenant
export async function POST(request: NextRequest) {
  // Implementation similar to existing admin routes
  // ...
}
```

---

## Security Considerations

### Data Isolation

1. **Row-Level Security (RLS)**: All Supabase tables must have RLS policies that filter by `tenant_id`. This is the primary security layer - even if application code forgets a WHERE clause, the database will return nothing.

2. **Optimistic Rewrites**: Middleware does NOT verify tenant existence (performance critical). Tenant validation happens in page components where it can be cached.

3. **API Route Protection**: All tenant-specific API routes must verify tenant context from headers and enforce `tenant_id` in all queries.

4. **Query Validation**: Never allow queries without `tenant_id` filter. Use helper functions that automatically inject `tenant_id`.

### Best Practices

```typescript
// ❌ BAD: Missing tenant_id filter
const { data } = await supabase.from('blog_posts').select('*')

// ✅ GOOD: Always filter by tenant_id
const { data } = await supabase.from('blog_posts').select('*').eq('tenant_id', tenant_id)

// ✅ GOOD: Use helper that enforces tenant_id
const { data } = await tenantAwareClient.supabase
  .from('blog_posts')
  .select('*')
  .eq('tenant_id', tenantAwareClient.tenant_id)
```

### Domain Validation

- Validate domain ownership (DNS TXT record verification)
- Prevent domain spoofing (verify tenant exists in database)
- Handle subdomain attacks (normalize hostname properly)

---

## Deployment Considerations

### Vercel Configuration

If hosting on Vercel, domains can be added programmatically:

```typescript
// Example: Add domain via Vercel API
import { VercelClient } from '@vercel/client'

const vercel = new VercelClient({
  token: process.env.VERCEL_TOKEN,
})

await vercel.domains.create({
  name: 'client-a.com',
  projectId: process.env.VERCEL_PROJECT_ID,
})
```

### Environment Variables

```env
# Admin domain
ADMIN_DOMAIN=admin.myplatform.com

# Platform domains (main marketing site)
PLATFORM_DOMAINS=myplatform.com,www.myplatform.com

# Vercel configuration (for domain management)
VERCEL_TOKEN=your_token_here
VERCEL_PROJECT_ID=your_project_id_here
```

### SSL Certificates

- **Vercel**: Automatic SSL via Let's Encrypt for all domains
- **Self-Hosted**: Use wildcard SSL certificates or automate via cert-manager

---

## Migration Strategy

### Phase 1: Foundation & Auth Spike (Week 1-2)

**Critical: Authentication Proof of Concept**

Before building the full system, prove authentication works across domains:

1. **Auth Spike (Days 1-3):**
   - Set up local development with multiple domains:
     - `localhost:3000` → Admin
     - `client-a.localhost:3000` → Tenant A (via `/etc/hosts` or local DNS)
   - Implement Supabase Auth on both domains
   - Verify cookies are properly scoped to each domain
   - Test: Login on tenant domain, verify admin domain doesn't see session
   - Test: Login on admin domain, verify tenant domain doesn't see session
   - **Success Criteria:** Separate sessions work correctly on separate domains

2. **Database Schema (Days 4-5):**
   - Create tenants and tenant_domains tables
   - Add tenant_id to existing tables (blog_posts, etc.)
   - Implement RLS policies
   - Create migration scripts

3. **Middleware Implementation (Days 6-7):**
   - Implement optimistic rewrite approach (NO database queries)
   - Test routing: admin domain → /admin, tenant domain → /sites/[domain]
   - Verify header injection (x-tenant-domain)
   - **Success Criteria:** Middleware latency < 10ms (no DB calls)

4. **Base Template (Days 8-10):**
   - Create `/sites/[domain]` directory structure
   - Build layout with hardcoded mock tenant (no DB yet)
   - Test routing and rendering with mock data
   - Build tenant configuration utilities
   - **Success Criteria:** Can visit tenant domain and see mock content

### Phase 2: Database Integration (Week 3)

1. Connect tenant config utilities to database
2. Implement tenant fetching in page components (with caching)
3. Replace mock tenant with real database queries
4. Implement 404 handling for invalid tenants
5. Test data isolation (verify RLS prevents cross-tenant access)

### Phase 3: Tenant Management UI (Week 4)

1. Extend admin dashboard with tenant management
2. Create API routes for tenant CRUD operations
3. Build tenant settings UI
4. Implement domain management

### Phase 4: Data Migration (Week 5)

1. Add `tenant_id` column to existing tables
2. Migrate existing data to default tenant
3. Update all queries to include `tenant_id`
4. Implement RLS policies

### Phase 5: Testing & Launch (Week 6)

1. End-to-end testing with multiple tenants
2. Performance testing
3. Security audit
4. Documentation
5. Launch with first beta tenant

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache tenant config in memory (refresh every 5 minutes)
import NodeCache from 'node-cache'

const tenantCache = new NodeCache({ stdTTL: 300 }) // 5 minutes

export async function getTenantByDomainCached(domain: string) {
  const cached = tenantCache.get<TenantConfig>(domain)
  if (cached) return cached

  const tenant = await getTenantByDomain(domain)
  if (tenant) {
    tenantCache.set(domain, tenant)
  }

  return tenant
}
```

### Database Indexes

- Index `tenants.domain`
- Index `tenant_domains.domain`
- Index all `tenant_id` columns in tenant-specific tables

### Middleware Optimization

- **No database queries in middleware** (critical for performance)
- Use optimistic rewrites (verify tenant in page component)
- Early returns for static assets (via matcher config)
- Consider Edge Config for tenant domain mapping if needed (advanced)

---

## Monitoring & Analytics

### Tenant-Specific Analytics

- Track traffic per tenant
- Monitor performance per tenant
- Alert on tenant-specific errors

### Platform Metrics

- Total tenant count
- Active tenant count
- Average traffic per tenant
- Resource usage per tenant

---

## Future Enhancements

### Phase 2 Features

- **Tenant-specific themes**: Pre-built theme templates
- **Custom domains**: Allow tenants to use their own domains
- **White-label options**: Remove platform branding
- **Tenant sub-users**: Allow tenants to manage their own users
- **Billing integration**: Per-tenant subscription management
- **Resource limits**: Bandwidth, storage, API rate limits per tenant

### Scalability Considerations

- **Database sharding**: Split tenants across multiple databases
- **CDN per tenant**: Custom CDN configurations
- **Caching strategies**: Redis per tenant or shared with tenant context
- **Queue management**: Separate job queues per tenant

---

## Risk Assessment

### High-Risk Areas

1. **Data Leakage**: Critical - Requires thorough testing and RLS policies
2. **Performance**: Medium - Monitor resource usage as tenant count grows
3. **Security**: High - Middleware and data isolation must be bulletproof
4. **Domain Management**: Medium - DNS and SSL certificate automation

### Mitigation Strategies

- Comprehensive testing with multiple tenants
- Automated security audits
- Rate limiting per tenant
- Resource usage monitoring
- Regular backup and disaster recovery testing

---

## Success Metrics

### Technical Metrics

- Zero data leakage incidents
- <100ms middleware latency (p95)
- 99.9% uptime per tenant
- <5s page load time (p95)

### Business Metrics

- Time to onboard new tenant: <1 hour
- Tenant satisfaction score: >4.5/5
- Platform adoption rate: % of eligible clients onboarded
- Infrastructure cost per tenant: Target <$X/month

---

## Documentation Requirements

### Developer Documentation

- Multi-tenant architecture overview
- Middleware implementation guide
- Data isolation patterns
- Tenant management API reference

### Admin Documentation

- How to create a new tenant
- How to configure tenant branding
- How to manage domains
- How to troubleshoot tenant issues

### End-User Documentation

- Tenant onboarding guide
- Customization options
- Domain setup instructions
- Support and resources

---

## Next Steps

1. **Review & Approval**: Stakeholder review of this blueprint
2. **Technical Spike**: Build proof-of-concept middleware
3. **Database Design Review**: Finalize schema with DBA
4. **Security Review**: Security team audit of isolation strategy
5. **Implementation Plan**: Break down into sprint-sized tasks
6. **Team Assignment**: Assign developers to different phases

---

## References

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Multi-Tenancy Guide](https://vercel.com/docs/concepts/multi-tenancy)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Platform Engineering Best Practices](https://platformengineering.org/)

---

## Key Architectural Decisions Summary

### Critical Decisions Made

1. **Optimistic Middleware Rewrites**: No database queries in middleware to maintain <10ms latency. Tenant validation moved to page components.

2. **Tenant-Isolated Authentication**: Users authenticate within a specific tenant domain. Simpler, more secure than unified auth.

3. **ISR for Tenant Pages**: Use `generateStaticParams` and ISR to pre-generate tenant pages, reducing database load and improving performance.

4. **RLS as Primary Security Layer**: Database-level enforcement prevents data leakage even if application code has bugs.

5. **Domain Verification via DNS**: Use CNAME or TXT records for domain ownership verification before SSL provisioning.

### Performance Targets

- **Middleware Latency**: <10ms (no database queries)
- **Page Load Time (p95)**: <5s
- **Tenant Config Cache**: 5-minute TTL with on-demand revalidation
- **ISR Revalidation**: 1 hour default, on-demand when tenant settings change

### Security Guarantees

- **Data Isolation**: RLS policies enforce tenant boundaries at database level
- **Cookie Scoping**: Auth cookies scoped to specific domains prevent cross-tenant access
- **Query Validation**: Helper functions ensure all queries include `tenant_id`
- **Domain Verification**: DNS verification required before serving custom domains

---

**Document Version**: 2.0  
**Last Updated**: 2025-01-19  
**Status**: Approved for Implementation (with Auth Spike required in Phase 1)
