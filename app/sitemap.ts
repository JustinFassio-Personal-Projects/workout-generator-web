import type { MetadataRoute } from 'next'
import {
  getAllPosts,
  getAllAuthors,
  getAllCategories,
  authorToSlug,
  categoryToSlug,
} from '@/features/blog/lib/getBlogPosts'
import { videos } from '@/data/videos'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all blog posts, authors, and categories
  const posts = await getAllPosts()
  const authors = await getAllAuthors()
  const categories = await getAllCategories()

  // Homepage
  const homepage: MetadataRoute.Sitemap[0] = {
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  }

  // Blog listing page - use most recent post's date (dateModified or date)
  const mostRecentPostDate =
    posts.length > 0 ? new Date(posts[0].dateModified || posts[0].date) : new Date()

  const blogPage: MetadataRoute.Sitemap[0] = {
    url: `${baseUrl}/blog`,
    lastModified: mostRecentPostDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  }

  // Blog post pages - use dateModified if available, otherwise use date
  const blogPosts: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.dateModified || post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  // Author pages
  const authorPages: MetadataRoute.Sitemap = authors.map(author => ({
    url: `${baseUrl}/blog/author/${authorToSlug(author)}`,
    lastModified: mostRecentPostDate,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map(category => ({
    url: `${baseUrl}/blog/category/${categoryToSlug(category)}`,
    lastModified: mostRecentPostDate,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Videos section (videos are on homepage with anchor)
  const videosPage: MetadataRoute.Sitemap[0] = {
    url: `${baseUrl}#videos`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }

  return [homepage, blogPage, videosPage, ...blogPosts, ...authorPages, ...categoryPages]
}
