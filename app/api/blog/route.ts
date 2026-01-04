import { NextResponse } from 'next/server'
import { getAllPublishedPosts } from '@/lib/blog/queries'

// Explicit caching: revalidate every 60 seconds (matching blog pages)
// Next.js 15 changed GET route handlers to be uncached by default
export const revalidate = 60

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
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}
