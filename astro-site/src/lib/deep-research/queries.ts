import { createPublicSupabaseClient } from '@/lib/supabase/public'
import type { DeepResearch } from '@/types/deep-research'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message)
  return 'Unknown error'
}

/**
 * Get all published deep research entries (for public index page).
 * Includes metadata for profile-based filtering.
 */
export async function getAllPublishedDeepResearch(): Promise<DeepResearch[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('deep_research')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching deep research:', errMsg(error))
    return []
  }

  return (data || []) as DeepResearch[]
}

/**
 * Get all published slugs (for sitemap).
 */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('deep_research')
    .select('slug')
    .eq('status', 'published')

  if (error) {
    return []
  }

  return (data || []).map((row: { slug: string }) => row.slug)
}

/**
 * Get a single published deep research entry by slug (for public detail page).
 */
export async function getDeepResearchBySlug(slug: string): Promise<DeepResearch | null> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('deep_research')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) {
    return null
  }

  return data as DeepResearch
}
