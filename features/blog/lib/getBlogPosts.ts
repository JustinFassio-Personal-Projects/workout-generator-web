import { BlogPost } from '../types'
import { blogPosts } from '@/data/blog/posts'

export async function getAllPosts(): Promise<BlogPost[]> {
  // In a real app, this might fetch from an API or CMS
  return [...blogPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return blogPosts.find(post => post.slug === slug) || null
}

export async function getAllPostSlugs(): Promise<string[]> {
  return blogPosts.map(post => post.slug)
}

/**
 * Get related posts based on shared tags and category
 * Priority: Posts with more shared tags > Same category > Most recent
 */
export async function getRelatedPosts(
  currentPost: BlogPost,
  limit: number = 3
): Promise<BlogPost[]> {
  const allPosts = await getAllPosts()

  // Filter out the current post
  const otherPosts = allPosts.filter(post => post.id !== currentPost.id)

  // Score each post based on relevance
  const scoredPosts = otherPosts.map(post => {
    let score = 0

    // Count shared tags (2 points each)
    const sharedTags = post.tags.filter(tag => currentPost.tags.includes(tag))
    score += sharedTags.length * 2

    // Same category (1 point)
    if (post.category === currentPost.category) {
      score += 1
    }

    return { post, score }
  })

  // Sort by score (descending), then by date (most recent first)
  scoredPosts.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime()
  })

  // Return top posts up to limit
  return scoredPosts.slice(0, limit).map(({ post }) => post)
}

/**
 * Get all unique authors from blog posts
 */
export async function getAllAuthors(): Promise<string[]> {
  const authors = new Set<string>()
  blogPosts.forEach(post => authors.add(post.author))
  return Array.from(authors).sort()
}

/**
 * Get posts by author
 */
export async function getPostsByAuthor(author: string): Promise<BlogPost[]> {
  const allPosts = await getAllPosts()
  return allPosts.filter(
    post => post.author.toLowerCase().replace(/\s+/g, '-') === author.toLowerCase()
  )
}

/**
 * Get all unique categories from blog posts
 */
export async function getAllCategories(): Promise<string[]> {
  const categories = new Set<string>()
  blogPosts.forEach(post => categories.add(post.category))
  return Array.from(categories).sort()
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const allPosts = await getAllPosts()
  return allPosts.filter(
    post => post.category.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
  )
}

/**
 * Convert author name to URL-friendly slug
 */
export function authorToSlug(author: string): string {
  return author.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Convert category name to URL-friendly slug
 */
export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, '-')
}
