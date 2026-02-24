import { NextResponse } from 'next/server'
import { getAllPublishedPosts } from '@/lib/blog/queries'

// Mark as dynamic since we use cookies() via createServerSupabaseClient()
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const posts = await getAllPublishedPosts()
    // Transform to match expected format for backward compatibility
    const transformedPosts = posts.map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      date: post.published_at || post.created_at,
      author: post.author?.name || 'Unknown',
      category: post.category?.name || 'Uncategorized',
      tags: post.tags || [],
      image: post.featured_image || undefined,
    }))
    return NextResponse.json(transformedPosts)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    // Log the full error for debugging; only expose limited details to clients
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    const isDev = process.env.NODE_ENV !== 'production'
    const responseBody = isDev
      ? { error: 'Failed to fetch blog posts', details: errorMessage }
      : { error: 'Failed to fetch blog posts' }
    return NextResponse.json(responseBody, { status: 500 })
  }
}
