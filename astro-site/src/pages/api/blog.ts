import type { APIRoute } from 'astro'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Disable prerendering for API routes
export const prerender = false

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerSupabaseClient(cookies)

    // Fetch published posts
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
        read_time,
        category:categories(id, slug, name),
        author:authors(id, name, avatar_url)
      `
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch blog posts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(posts || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
