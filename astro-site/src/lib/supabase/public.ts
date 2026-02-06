import { createClient } from '@supabase/supabase-js'

/**
 * Create a public Supabase client for anonymous access
 * Used for operations that don't require cookies (RSS feed, sitemap, etc.)
 */
export function createPublicSupabaseClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  return createClient(url, key)
}
