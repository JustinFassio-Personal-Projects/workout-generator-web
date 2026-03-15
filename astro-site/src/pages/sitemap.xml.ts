import type { APIRoute } from 'astro'
import { createPublicSupabaseClient } from '@/lib/supabase/public'
import { videos } from '@/data/videos'
import { reports } from '@/types/reports'
import { milestones } from '@/data/story-milestones'
import { getAllPublishedSlugs as getDeepResearchSlugs } from '@/lib/deep-research/queries'

export const prerender = false

const baseUrl = import.meta.env.PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

interface SitemapEntry {
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(entry => {
      let xml = `  <url>\n    <loc>${entry.url}</loc>`
      if (entry.lastmod) {
        xml += `\n    <lastmod>${entry.lastmod}</lastmod>`
      }
      if (entry.changefreq) {
        xml += `\n    <changefreq>${entry.changefreq}</changefreq>`
      }
      if (entry.priority !== undefined) {
        xml += `\n    <priority>${entry.priority.toFixed(1)}</priority>`
      }
      xml += '\n  </url>'
      return xml
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export const GET: APIRoute = async () => {
  const entries: SitemapEntry[] = []
  const now = formatDate(new Date())

  // Homepage
  entries.push({
    url: baseUrl,
    lastmod: now,
    changefreq: 'weekly',
    priority: 1.0,
  })

  // Static pages
  const staticPages = [
    { path: '/about', priority: 0.7, changefreq: 'monthly' as const },
    { path: '/blog', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/equipment', priority: 0.9, changefreq: 'monthly' as const },
    { path: '/onboard', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/onboarding', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/exercise-challenge', priority: 0.7, changefreq: 'monthly' as const },
    { path: '/founder-story', priority: 0.7, changefreq: 'monthly' as const },
    { path: '/faq', priority: 0.7, changefreq: 'monthly' as const },
    { path: '/reports', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/deep-research', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/videos', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/exercises', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/learn', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/explore', priority: 0.9, changefreq: 'weekly' as const },
  ]

  for (const page of staticPages) {
    entries.push({
      url: `${baseUrl}${page.path}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
    })
  }

  // Video watch pages (static data)
  for (const video of videos) {
    entries.push({
      url: `${baseUrl}/videos/${video.id}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.7,
    })
  }

  // Reports pages (static data)
  for (const report of reports) {
    entries.push({
      url: `${baseUrl}/reports/${report.slug}`,
      lastmod: report.dateModified || report.date,
      changefreq: 'monthly',
      priority: 0.7,
    })
  }

  // Story milestone pages (static data)
  for (const milestone of milestones) {
    entries.push({
      url: `${baseUrl}/story/${milestone.slug}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.6,
    })
  }

  // Dynamic content from Supabase
  const supabase = createPublicSupabaseClient()

  if (supabase) {
    // Blog posts
    const { data: posts } = await supabase
      .from('posts')
      .select('slug, updated_at, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (posts && posts.length > 0) {
      for (const post of posts) {
        const lastmod = post.updated_at || post.published_at || post.created_at
        entries.push({
          url: `${baseUrl}/blog/${post.slug}`,
          lastmod: lastmod ? formatDate(new Date(lastmod)) : now,
          changefreq: 'monthly',
          priority: 0.7,
        })
      }
    }

    // Authors
    const { data: authors } = await supabase.from('authors').select('slug')
    if (authors) {
      for (const author of authors) {
        entries.push({
          url: `${baseUrl}/blog/author/${author.slug}`,
          lastmod: now,
          changefreq: 'weekly',
          priority: 0.6,
        })
      }
    }

    // Categories
    const { data: categories } = await supabase.from('categories').select('slug')
    if (categories) {
      for (const category of categories) {
        entries.push({
          url: `${baseUrl}/blog/category/${category.slug}`,
          lastmod: now,
          changefreq: 'weekly',
          priority: 0.6,
        })
      }
    }
  }

  // Deep research pages
  const deepResearchSlugs = await getDeepResearchSlugs()
  for (const slug of deepResearchSlugs) {
    entries.push({
      url: `${baseUrl}/deep-research/${slug}`,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.7,
    })
  }

  const sitemapXml = buildSitemapXml(entries)

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
