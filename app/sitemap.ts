import type { MetadataRoute } from 'next'
import { getAllPosts, getAllPostSlugs } from '@/features/blog/lib/getBlogPosts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

  // Get all blog posts
  const posts = await getAllPosts()
  const postSlugs = await getAllPostSlugs()

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
  const blogPosts: MetadataRoute.Sitemap = postSlugs.map(slug => {
    const post = posts.find(p => p.slug === slug)
    return {
      url: `${baseUrl}/blog/${slug}`,
      lastModified: post ? new Date(post.date) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }
  })

  return [homepage, blogPage, ...blogPosts]
}
