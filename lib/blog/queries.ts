import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { PostWithRelations, Category, Author } from '@/types/blog'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

/**
 * Transform Supabase post data to handle joined relations.
 * Supabase returns joined relations as arrays, but we need single objects.
 * Note: PostWithRelations requires category and author, but we handle nulls
 * by providing fallback objects or the type system will handle it.
 */
function transformPost(post: Record<string, unknown>): PostWithRelations {
  const category = Array.isArray(post.category)
    ? ((post.category[0] as Category | undefined) ?? null)
    : (post.category as Category | null)

  const author = Array.isArray(post.author)
    ? ((post.author[0] as Author | undefined) ?? null)
    : (post.author as Author | null)

  return {
    ...post,
    category,
    author,
  } as PostWithRelations
}

/**
 * Transform an array of Supabase post data
 */
function transformPosts(posts: Record<string, unknown>[]): PostWithRelations[] {
  return posts.map(transformPost)
}

/**
 * Get all published posts with their relations
 */
export async function getAllPublishedPosts(): Promise<PostWithRelations[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }

  return transformPosts(data || [])
}

/**
 * Get a single published post by slug
 */
export async function getPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error('Error fetching post:', error)
    return null
  }

  if (!data) {
    return null
  }

  return transformPost(data)
}

/**
 * Get all published post slugs for static generation
 */
export async function getAllPostSlugs(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.from('posts').select('slug').eq('status', 'published')

  if (error) {
    console.error('Error fetching slugs:', error)
    return []
  }

  return data?.map(p => p.slug) || []
}

/**
 * Get posts by category slug
 */
export async function getPostsByCategory(categorySlug: string): Promise<PostWithRelations[]> {
  const supabase = await createServerSupabaseClient()

  // First get the category ID
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single()

  if (!category) return []

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('status', 'published')
    .eq('category_id', category.id)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts by category:', error)
    return []
  }

  return transformPosts(data || [])
}

/**
 * Get posts by author slug
 */
export async function getPostsByAuthor(authorSlug: string): Promise<PostWithRelations[]> {
  const supabase = await createServerSupabaseClient()

  // First get the author ID
  const { data: author } = await supabase
    .from('authors')
    .select('id')
    .eq('slug', authorSlug)
    .single()

  if (!author) return []

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('status', 'published')
    .eq('author_id', author.id)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts by author:', error)
    return []
  }

  return transformPosts(data || [])
}

/**
 * Get related posts based on category and tags
 */
export async function getRelatedPosts(
  currentPost: PostWithRelations,
  limit: number = 3
): Promise<PostWithRelations[]> {
  const supabase = await createServerSupabaseClient()

  // If post has no category, return empty array (can't find related posts by category)
  if (!currentPost.category_id) {
    return []
  }

  // Get posts from same category, excluding current post
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('status', 'published')
    .eq('category_id', currentPost.category_id)
    .neq('id', currentPost.id)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching related posts:', error)
    return []
  }

  return transformPosts(data || [])
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.from('categories').select('*').order('name')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data || []
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).single()

  if (error) {
    console.error('Error fetching category:', error)
    return null
  }

  return data
}

/**
 * Get all authors
 */
export async function getAllAuthors(): Promise<Author[]> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.from('authors').select('*').order('name')

  if (error) {
    console.error('Error fetching authors:', error)
    return []
  }

  return data || []
}

/**
 * Get author by slug
 */
export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.from('authors').select('*').eq('slug', slug).single()

  if (error) {
    console.error('Error fetching author:', error)
    return null
  }

  return data
}

/**
 * Search posts by query string
 */
export async function searchPosts(query: string): Promise<PostWithRelations[]> {
  if (!query.trim()) return []

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error searching posts:', error)
    return []
  }

  return transformPosts(data || [])
}

/**
 * Convert author name to slug
 */
export function authorToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Convert category name to slug
 */
export function categoryToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
