import { createPublicSupabaseClient } from '@/lib/supabase/public'

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

/**
 * Fetch tenant by domain from Supabase (tenants table).
 * No Next.js cache; for Astro use. Optional: add short TTL in-memory cache if needed.
 */
export async function getTenantByDomain(domain: string): Promise<TenantConfig | null> {
  const supabase = createPublicSupabaseClient()

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
