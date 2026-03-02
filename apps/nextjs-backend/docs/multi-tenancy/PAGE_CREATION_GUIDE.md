# Page Creation Guide for Multi-Tenant Architecture

## Overview

With the multi-tenant architecture in place, you need to decide **where** and **how** to create new pages based on their intended audience and functionality.

## Architecture Summary

### Domain Types

1. **Platform Domains** (`localhost`, `aiworkoutgenerator.com`, `workoutgenerator.com`)
   - Serve platform-level marketing content
   - Routes: `/app/*` (e.g., `/app/faq/`, `/app/blog/`, `/app/about/`)

2. **Tenant Domains** (`client-a.localhost`, `client-b.localhost`, etc.)
   - Serve tenant-specific marketing sites
   - Routes: `/app/sites/[domain]/*` (rewritten from tenant domain)

3. **Admin Domain** (`admin.localhost`)
   - Admin dashboard
   - Routes: `/app/admin/*`

### Current Routing Logic

The middleware (`proxy.ts`) handles routing:

- **Platform routes** bypass tenant rewriting (accessible on both platform and tenant domains)
- **Tenant routes** are rewritten to `/sites/[domain]/*` (only accessible on tenant domains)
- **Admin routes** are rewritten to `/admin/*` (only accessible on admin domain)

## Decision Matrix: Where Should New Pages Go?

### Option 1: Platform-Only Pages (Recommended for Most Cases)

**Use when:**

- Content is platform-wide (not tenant-specific)
- SEO benefits from platform domain
- Content is shared across all tenants
- Examples: FAQ, About, Blog, Reports, Equipment Catalog

**Location:** `/app/[page-name]/page.tsx`

**Accessibility:**

- ✅ Accessible on platform domains (`localhost:3001/faq`)
- ✅ Accessible on tenant domains (`client-a.localhost:3001/faq`) - bypasses rewrite
- ❌ NOT accessible as tenant-specific content

**Example:**

```typescript
// /app/faq/page.tsx
export default function FAQPage() {
  return <div>Platform FAQ content</div>
}
```

**To make it accessible on tenant domains:**
Add the route to the `platformRoutes` array in `proxy.ts`:

```typescript
const platformRoutes = [
  '/faq',
  '/blog',
  '/about',
  '/reports',
  '/equipment',
  '/onboard',
  '/videos',
  '/exercise-challenge',
  '/founder-story',
  '/story',
  '/your-new-page', // Add here
]
```

### Option 2: Tenant-Specific Pages

**Use when:**

- Content should be tenant-specific (different per tenant)
- Tenant branding/customization needed
- Content isolation required
- Examples: Tenant About page, Tenant Blog, Tenant Contact

**Location:** `/app/sites/[domain]/[page-name]/page.tsx`

**Accessibility:**

- ❌ NOT accessible on platform domains
- ✅ Accessible on tenant domains (`client-a.localhost:3001/about` → `/sites/client-a.localhost/about`)

**Example:**

```typescript
// /app/sites/[domain]/about/page.tsx
import { headers } from 'next/headers'
import { getTenantByDomainCached } from '@/lib/multi-tenant/tenant-config'

export default async function TenantAboutPage({
  params
}: {
  params: { domain: string }
}) {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-domain') || params.domain
  const tenant = await getTenantByDomainCached(tenantDomain)

  return (
    <div style={{ color: tenant?.primary_color }}>
      <h1>About {tenant?.name}</h1>
      {/* Tenant-specific content */}
    </div>
  )
}
```

### Option 3: Shared Pages with Tenant Context

**Use when:**

- Same page structure, but content varies by tenant
- Platform fallback needed when no tenant context
- Examples: Blog (platform blog + tenant-specific posts)

**Location:** `/app/[page-name]/page.tsx` with tenant-aware logic

**Implementation:**

```typescript
// /app/blog/page.tsx
import { headers } from 'next/headers'
import { getTenantByDomainCached } from '@/lib/multi-tenant/tenant-config'

export default async function BlogPage() {
  const headersList = await headers()
  const tenantDomain = headersList.get('x-tenant-domain')
  const tenant = tenantDomain ? await getTenantByDomainCached(tenantDomain) : null

  // Show tenant-specific blog if on tenant domain, otherwise platform blog
  if (tenant) {
    return <TenantBlog tenant={tenant} />
  }

  return <PlatformBlog />
}
```

## Current Platform Routes (Already Configured)

These routes are accessible on both platform and tenant domains:

- `/faq`
- `/blog`
- `/about`
- `/reports`
- `/equipment`
- `/onboard`
- `/videos`
- `/exercise-challenge`
- `/founder-story`
- `/story`

## Step-by-Step: Creating a New Page

### Scenario A: New Platform Page (e.g., `/pricing`)

1. **Create the page:**

   ```bash
   /app/pricing/page.tsx
   ```

2. **Add to platform routes in `proxy.ts`:**

   ```typescript
   const platformRoutes = [
     // ... existing routes
     '/pricing', // Add new route
   ]
   ```

3. **Result:**
   - Accessible at `localhost:3001/pricing`
   - Accessible at `client-a.localhost:3001/pricing`

### Scenario B: New Tenant-Specific Page (e.g., `/contact`)

1. **Create the page:**

   ```bash
   /app/sites/[domain]/contact/page.tsx
   ```

2. **Access tenant context:**

   ```typescript
   import { headers } from 'next/headers'
   import { getTenantByDomainCached } from '@/lib/multi-tenant/tenant-config'

   export default async function TenantContactPage({ params }) {
     const headersList = await headers()
     const tenantDomain = headersList.get('x-tenant-domain') || params.domain
     const tenant = await getTenantByDomainCached(tenantDomain)
     // Use tenant for branding, content, etc.
   }
   ```

3. **Result:**
   - Accessible at `client-a.localhost:3001/contact`
   - NOT accessible at `localhost:3001/contact`

### Scenario C: New Admin Page

1. **Create the page:**

   ```bash
   /app/admin/your-feature/page.tsx
   ```

2. **Result:**
   - Accessible at `admin.localhost:3001/your-feature`
   - Protected by admin authentication middleware

## Important Considerations

### 1. SEO Implications

- **Platform pages** benefit from platform domain authority
- **Tenant pages** have separate SEO profiles per tenant domain
- Consider which approach benefits your SEO strategy

### 2. Content Management

- **Platform pages**: Update once, affects all users
- **Tenant pages**: Each tenant can have unique content
- **Shared pages**: More complex, need tenant-aware logic

### 3. Performance

- Platform routes bypass tenant rewrite (faster)
- Tenant routes require tenant lookup (cached, but still overhead)
- Consider caching strategy for tenant-specific content

### 4. Data Isolation

- Platform pages: No tenant context needed
- Tenant pages: Must use tenant context for data queries
- Shared pages: Need conditional logic based on tenant presence

## Best Practices

1. **Default to Platform Pages**: Unless you specifically need tenant-specific content, create platform pages
2. **Add to Platform Routes**: Always add new platform pages to the `platformRoutes` array
3. **Use Tenant Context**: When creating tenant pages, always use `getTenantByDomainCached()` for tenant data
4. **Test on Both Domains**: Test new pages on both platform and tenant domains
5. **Document Tenant-Specific Features**: If a page has tenant-specific behavior, document it clearly

## Migration Path

If you need to convert an existing platform page to tenant-specific:

1. Move page from `/app/[page]/page.tsx` to `/app/sites/[domain]/[page]/page.tsx`
2. Remove from `platformRoutes` array in `proxy.ts`
3. Add tenant context logic
4. Update all links/navigation to use tenant-aware routing

## Examples from Current Codebase

### Platform Page Example: `/app/faq/page.tsx`

- Platform-wide FAQ content
- Accessible on all domains
- Listed in `platformRoutes`

### Tenant Page Example: `/app/sites/[domain]/page.tsx`

- Tenant homepage
- Uses tenant branding
- Only accessible on tenant domains

### Shared Page Example: `/app/blog/page.tsx`

- Could be enhanced to show tenant-specific blog posts when on tenant domain
- Currently platform-only, but structure supports tenant awareness

## Questions to Ask Before Creating a Page

1. **Should this content be the same for all tenants?** → Platform page
2. **Should each tenant have their own version?** → Tenant page
3. **Should it vary based on tenant but have platform fallback?** → Shared page
4. **Is this admin-only functionality?** → Admin page

## Summary

- **Most new pages** should be **platform pages** (Option 1)
- **Add new platform routes** to the `platformRoutes` array in `proxy.ts`
- **Use tenant pages** only when tenant-specific content is required
- **Test thoroughly** on both platform and tenant domains
