import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { videos } from '@/data/videos'
import { reports } from '@/types/reports'
import { getAllMilestoneSlugs } from '@/data/story/milestones'

// ISR: Revalidate every 60 seconds (fallback)
// Primary revalidation happens on-demand when admin publishes
export const revalidate = 60

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

  // Static pages - always included
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/equipment`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/onboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/exercise-challenge`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/founder-story`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reports`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Video watch pages (always included, not dependent on Supabase)
  const videoPages: MetadataRoute.Sitemap = videos.map(video => ({
    url: `${baseUrl}/videos/${video.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Reports pages (static data)
  const reportPages: MetadataRoute.Sitemap = reports.map(report => ({
    url: `${baseUrl}/reports/${report.slug}`,
    lastModified: new Date(report.dateModified || report.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Story milestone pages (static data)
  const storyPages: MetadataRoute.Sitemap = getAllMilestoneSlugs().map(slug => ({
    url: `${baseUrl}/story/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  // If Supabase is not configured, return static pages + videos + reports + story
  if (!supabase) {
    return [homepage, blogPage, ...staticPages, ...videoPages, ...reportPages, ...storyPages]
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
    lastModified: new Date(post.updated_at || post.published_at || post.created_at || Date.now()),
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

  return [
    homepage,
    blogPage,
    ...staticPages,
    ...blogPosts,
    ...authorPages,
    ...categoryPages,
    ...videoPages,
    ...reportPages,
    ...storyPages,
  ]
}
