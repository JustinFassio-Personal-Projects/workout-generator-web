import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AstroCookies } from 'astro'
import { featuredContentConfig } from './config'

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

export interface FeaturedWorkout {
  id: string
  title: string
  description: string | null
  created_at: string
}

/**
 * Returns true if Supabase is configured (e.g. in production). When false, we skip
 * queries so the build can complete without env vars (CI, preview deploys).
 */
function isSupabaseConfigured(): boolean {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  return typeof url === 'string' && url.length > 0 && typeof key === 'string' && key.length > 0
}

/**
 * Fetch featured programs for the homepage.
 * Uses RLS; requires "Anyone can read featured programs" policy.
 * Defense-in-depth: also filter by is_public so non-public programs never appear.
 */
export async function getFeaturedPrograms(
  cookies: AstroCookies,
  limit = 3
): Promise<FeaturedProgram[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = createServerSupabaseClient(cookies)
  const { data, error } = await supabase
    .from('programs')
    .select('id, title, description, created_at')
    .eq('featured_on_landing', true)
    .eq('is_public', true)
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
  if (!isSupabaseConfigured()) return []

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

/**
 * Fetch featured workout sets for the homepage.
 * Uses RLS; requires "Anyone can read published workout_sets" policy.
 */
export async function getFeaturedWorkouts(
  cookies: AstroCookies,
  limit = 3
): Promise<FeaturedWorkout[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = createServerSupabaseClient(cookies)
  const { data, error } = await supabase
    .from('workout_sets')
    .select('id, title, description, created_at')
    .eq('featured_on_landing', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[featured] getFeaturedWorkouts error:', error.message)
    return []
  }

  return (data ?? []) as FeaturedWorkout[]
}

export interface FeaturedContentResult {
  programs: FeaturedProgram[]
  challenges: FeaturedChallenge[]
  workouts: FeaturedWorkout[]
}

export interface FeaturedContentOptions {
  programLimit?: number
  challengeLimit?: number
  workoutLimit?: number
}

/**
 * Fetch all featured content in one call (programs, challenges, workouts).
 * Uses config limits when options are omitted.
 * On any unexpected error, returns empty arrays so the site still builds and serves.
 */
export async function getFeaturedContent(
  cookies: AstroCookies,
  options?: FeaturedContentOptions
): Promise<FeaturedContentResult> {
  const empty: FeaturedContentResult = { programs: [], challenges: [], workouts: [] }
  try {
    const { limits } = featuredContentConfig
    const programLimit = options?.programLimit ?? limits.programs
    const challengeLimit = options?.challengeLimit ?? limits.challenges
    const workoutLimit = options?.workoutLimit ?? limits.workouts

    const [programs, challenges, workouts] = await Promise.all([
      getFeaturedPrograms(cookies, programLimit),
      getFeaturedChallenges(cookies, challengeLimit),
      getFeaturedWorkouts(cookies, workoutLimit),
    ])

    return { programs, challenges, workouts }
  } catch (err) {
    console.error('[featured] getFeaturedContent error:', err instanceof Error ? err.message : err)
    return empty
  }
}
