import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { AstroCookies } from 'astro'

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
