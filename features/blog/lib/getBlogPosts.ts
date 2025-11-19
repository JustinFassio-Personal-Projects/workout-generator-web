import { BlogPost } from '../types'
import { blogPosts } from '@/data/blog/posts'

export async function getAllPosts(): Promise<BlogPost[]> {
  // In a real app, this might fetch from an API or CMS
  return blogPosts.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return blogPosts.find(post => post.slug === slug) || null
}

export async function getAllPostSlugs(): Promise<string[]> {
  return blogPosts.map(post => post.slug)
}

