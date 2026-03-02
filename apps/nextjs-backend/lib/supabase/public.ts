import { createClient } from '@supabase/supabase-js'

/**
 * Creates a simple Supabase client for static generation contexts
 * (e.g., sitemap, RSS feed) where no cookies/session are needed.
 * Uses the anon key for public data access with RLS protection.
 *
 * Returns null if Supabase environment variables are not configured.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  return createClient(url, key)
}
