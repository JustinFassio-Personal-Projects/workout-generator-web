import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/public'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient()

  // Static pages - always included
  const homepage: MetadataRoute.Sitemap[0] = {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  }

  const blogPage: MetadataRoute.Sitemap[0] = {
    url: `${baseUrl}/blog`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }

  const videosPage: MetadataRoute.Sitemap[0] = {
    url: `${baseUrl}#videos`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }

  // If Supabase is not configured, return just static pages
  if (!supabase) {
    return [homepage, blogPage, videosPage]
  }

  // Fetch dynamic content
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published_at, created_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const { data: authors } = await supabase.from('authors').select('slug')

  const { data: categories } = await supabase.from('categories').select('slug')

  // Update blog page with most recent post date
  const mostRecentPostDate =
    posts && posts.length > 0
      ? new Date(posts[0].updated_at || posts[0].published_at || posts[0].created_at || Date.now())
      : new Date()

  blogPage.lastModified = mostRecentPostDate

  // Blog post pages
  const blogPosts: MetadataRoute.Sitemap = (posts || []).map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at || post.published_at || post.created_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Author pages
  const authorPages: MetadataRoute.Sitemap = (authors || []).map(author => ({
    url: `${baseUrl}/blog/author/${author.slug}`,
    lastModified: mostRecentPostDate,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map(category => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: mostRecentPostDate,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [homepage, blogPage, videosPage, ...blogPosts, ...authorPages, ...categoryPages]
}
