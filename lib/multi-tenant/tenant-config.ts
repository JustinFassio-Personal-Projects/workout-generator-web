import { createPublicClient } from '@/lib/supabase/public'
import { unstable_cache } from 'next/cache'

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
  // Use public client (no cookies) since tenant data is public and doesn't require user session
  // This allows it to work inside unstable_cache() without violating Next.js cache rules
  const supabase = createPublicClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('domain', domain)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    domain: data.domain,
    name: data.name,
    logo_url: data.logo_url,
    favicon_url: data.favicon_url,
    primary_color: data.primary_color,
    secondary_color: data.secondary_color,
    custom_css: data.custom_css,
    settings: data.settings || {},
  }
}

// Cached version for performance
// Note: Tags must be static - dynamic tags based on parameters are not supported by unstable_cache
// For on-demand revalidation, use revalidateTag('tenant-config') to invalidate all tenant caches
export async function getTenantByDomainCached(domain: string) {
  return unstable_cache(
    async () => getTenantByDomain(domain),
    ['tenant-config', domain], // Include domain in cache key to prevent cross-tenant cache collisions
    {
      revalidate: 300, // 5 minutes
      tags: ['tenant-config'], // Static tag for cache invalidation
    }
  )()
}
