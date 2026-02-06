import type { APIRoute } from 'astro'
import { createPublicSupabaseClient } from '@/lib/supabase/public'
import { fallbackPosts } from '@/data/blog/fallback-posts'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message)
  return 'Unknown error'
}

export const prerender = false

const baseUrl = import.meta.env.PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

interface RSSPost {
  slug: string
  title: string
  excerpt: string
  published_at: string | null
  created_at: string
  featured_image: string | null
  author: { name: string } | null
  category: { name: string } | null
}

/**
 * Escape XML special characters for safe interpolation
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Detect MIME type from image URL extension
 */
function getImageMimeType(imageUrl: string): string {
  const ext = imageUrl.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  }
  return mimeTypes[ext] || 'image/jpeg'
}

export const GET: APIRoute = async () => {
  let posts: RSSPost[] = []

  // Try to fetch from Supabase
  const supabase = createPublicSupabaseClient()

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          slug,
          title,
          excerpt,
          published_at,
          created_at,
          featured_image,
          author:authors(name),
          category:categories(name)
        `
        )
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (!error && data && data.length > 0) {
        // Transform the data to handle Supabase's array return for relations
        posts = data.map((post: Record<string, unknown>) => ({
          slug: post.slug as string,
          title: post.title as string,
          excerpt: post.excerpt as string,
          published_at: post.published_at as string | null,
          created_at: post.created_at as string,
          featured_image: post.featured_image as string | null,
          author: Array.isArray(post.author)
            ? (post.author[0] as { name: string } | null)
            : (post.author as { name: string } | null),
          category: Array.isArray(post.category)
            ? (post.category[0] as { name: string } | null)
            : (post.category as { name: string } | null),
        }))
      }
    } catch (e) {
      console.error('Error fetching posts for RSS feed:', errMsg(e))
    }
  }

  // Fallback to static posts if no Supabase data
  if (posts.length === 0) {
    posts = fallbackPosts.map(post => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      published_at: post.date,
      created_at: post.date,
      featured_image: post.image || null,
      author: { name: post.author },
      category: { name: post.category },
    }))
  }

  // Generate RSS 2.0 XML
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Workout Generator Blog</title>
    <description>Fitness tips, workout strategies, and AI-powered training advice from certified trainers</description>
    <link>${baseUrl}/blog</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-US</language>
    <managingEditor>support@aiworkoutgenerator.com (AI Workout Generator)</managingEditor>
    <webMaster>support@aiworkoutgenerator.com (AI Workout Generator)</webMaster>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>AI Workout Generator Blog</title>
      <link>${baseUrl}/blog</link>
    </image>${posts
      .map(post => {
        const pubDate = post.published_at || post.created_at
        const postUrl = `${baseUrl}/blog/${post.slug}`

        // Handle both absolute URLs and relative paths for images
        let postImage = `${baseUrl}/og-image.jpg`
        if (post.featured_image) {
          postImage = post.featured_image.startsWith('http')
            ? post.featured_image
            : `${baseUrl}${post.featured_image}`
        }

        const authorName = post.author?.name || 'AI Workout Generator'
        const categoryName = post.category?.name || 'Uncategorized'

        return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${new Date(pubDate).toUTCString()}</pubDate>
      <author>support@aiworkoutgenerator.com (${escapeXml(authorName)})</author>
      <category>${escapeXml(categoryName)}</category>${
        post.featured_image
          ? `
      <enclosure url="${postImage}" type="${getImageMimeType(postImage)}" length="0"/>`
          : ''
      }
    </item>`
      })
      .join('')}
  </channel>
</rss>`

  return new Response(rssXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
