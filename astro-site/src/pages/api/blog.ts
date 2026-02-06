import type { APIRoute } from 'astro'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message)
  return 'Unknown error'
}

// Disable prerendering for API routes
export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const CACHE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const url = import.meta.env.PUBLIC_SUPABASE_URL
    const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      // Supabase not configured: return empty array so BlogPreview can show fallback
      return new Response(JSON.stringify([]), { status: 200, headers: CACHE_HEADERS })
    }

    const supabase = createServerSupabaseClient(cookies)

    const { data: posts, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        slug,
        title,
        excerpt,
        featured_image,
        published_at,
        category:categories(id, slug, name),
        author:authors(id, name, avatar)
      `
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', errMsg(error))
      // Degrade gracefully: return empty array so BlogPreview shows fallback
      return new Response(JSON.stringify([]), { status: 200, headers: CACHE_HEADERS })
    }

    return new Response(JSON.stringify(posts || []), {
      status: 200,
      headers: CACHE_HEADERS,
    })
  } catch (error) {
    console.error('API error:', errMsg(error))
    // Supabase client throw or other failure: return empty array so page doesn't 500
    return new Response(JSON.stringify([]), { status: 200, headers: JSON_HEADERS })
  }
}
