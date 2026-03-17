import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { AstroCookies } from 'astro'

/**
 * Supabase client for server-side API routes that don't need cookie-based auth
 * (e.g. analytics page-view / funnel events). Uses anon key; RLS allows anon insert for web_events / analytics_funnel_events.
 */
export function getSupabaseForAnalytics() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY required for analytics')
  return createClient(url, anonKey)
}

/**
 * Create a Supabase client for server-side operations in Astro
 * This adapts the Next.js pattern for Astro's cookie API
 */
export function createServerSupabaseClient(cookies: AstroCookies) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) {
          return cookies.get(key)?.value
        },
        set(key: string, value: string, options: CookieOptions) {
          cookies.set(key, value, options)
        },
        remove(key: string, options: CookieOptions) {
          cookies.delete(key, options)
        },
      },
    }
  )
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
