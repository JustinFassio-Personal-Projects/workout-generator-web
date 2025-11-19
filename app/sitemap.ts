import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // Get all blog posts
  const posts = await getAllPosts()

  // Homepage
  const homepage: MetadataRoute.Sitemap[0] = {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  }

  // Blog listing page
  const blogPage: MetadataRoute.Sitemap[0] = {
    url: `${baseUrl}/blog`,
    lastModified: posts.length > 0 ? new Date(posts[0].date) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }

  // Blog post pages
  const blogPosts: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [homepage, blogPage, ...blogPosts]
}
