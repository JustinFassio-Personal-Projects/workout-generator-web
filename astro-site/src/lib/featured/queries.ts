import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AstroCookies } from 'astro'

export interface FeaturedProgram {
  id: string
  title: string
  description: string | null
  created_at: string
}

export interface FeaturedChallenge {
  id: string
  title: string
  description: string | null
  hero_image_url: string | null
  created_at: string
}

/**
 * Fetch featured programs for the homepage.
 * Uses RLS; requires "Anyone can read featured programs" policy.
 */
export async function getFeaturedPrograms(
  cookies: AstroCookies,
  limit = 3
): Promise<FeaturedProgram[]> {
  const supabase = createServerSupabaseClient(cookies)
  const { data, error } = await supabase
    .from('programs')
    .select('id, title, description, created_at')
    .eq('featured_on_landing', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[featured] getFeaturedPrograms error:', error.message)
    return []
  }

  return (data ?? []) as FeaturedProgram[]
}

/**
 * Fetch featured challenges for the homepage.
 * Uses RLS; requires "Anyone can read published challenges" policy.
 */
export async function getFeaturedChallenges(
  cookies: AstroCookies,
  limit = 3
): Promise<FeaturedChallenge[]> {
  const supabase = createServerSupabaseClient(cookies)
  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, description, hero_image_url, created_at')
    .eq('featured_on_landing', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[featured] getFeaturedChallenges error:', error.message)
    return []
  }

  return (data ?? []) as FeaturedChallenge[]
}
