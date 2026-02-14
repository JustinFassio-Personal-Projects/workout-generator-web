import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { PostWithRelations, Category, Author } from '@/types/blog'
import { blogPosts } from '@/data/blog/posts'
import type { BlogPost } from '@/features/blog/types'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

/**
 * Safe error detail for server logs: avoid logging full error objects (stack traces, nested causes).
 * Log message + name only; optional cause message if present.
 */
function safeErrorLog(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? error.cause.message : undefined
    return cause
      ? `${error.name}: ${error.message} (cause: ${cause})`
      : `${error.name}: ${error.message}`
  }
  return String(error)
}

/**
 * Run a callback with the server Supabase client. If client creation fails,
 * logs with safeErrorLog and returns the provided fallback.
 */
async function withSupabaseClient<T>(
  context: string,
  fallback: T,
  fn: (supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) => Promise<T>
): Promise<T> {
  try {
    const supabase = await createServerSupabaseClient()
    return await fn(supabase)
  } catch (error) {
    console.error(`Failed to connect to Supabase in ${context}:`, safeErrorLog(error))
    return fallback
  }
}

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
 * Convert static blog posts to PostWithRelations format (fallback when Supabase is unavailable)
 */
function convertStaticPostsToSupabaseFormat(staticPosts: BlogPost[]): PostWithRelations[] {
  return staticPosts.map(post => {
    const publishedDate = post.date || new Date().toISOString()
    const categorySlug = post.category.toLowerCase().replace(/\s+/g, '-')
    const authorSlug = post.author.toLowerCase().replace(/\s+/g, '-')

    const category: Category = {
      id: `category-${categorySlug}`,
      name: post.category,
      slug: categorySlug,
      description: null,
      created_at: publishedDate,
    }

    const author: Author = {
      id: `author-${authorSlug}`,
      name: post.author,
      slug: authorSlug,
      bio: null,
      avatar: null,
      created_at: publishedDate,
    }

    const converted = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category_id: category.id,
      author_id: author.id,
      tags: post.tags || [],
      featured_image: post.image || null,
      status: 'published' as const,
      published_at: publishedDate,
      seo_title: null,
      seo_description: null,
      created_at: publishedDate,
      updated_at: post.dateModified || publishedDate,
      category,
      author,
    }
    return converted
  })
}

/**
 * Get all published posts with their relations
 * Falls back to static data if Supabase is unavailable or returns no results
 */
export async function getAllPublishedPosts(): Promise<PostWithRelations[]> {
  const fallback = convertStaticPostsToSupabaseFormat(blogPosts)
  return withSupabaseClient('getAllPublishedPosts', fallback, async supabase => {
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
      console.error('Error fetching posts from Supabase, using fallback data:', safeErrorLog(error))
      return fallback
    }

    if (data && data.length > 0) {
      return transformPosts(data)
    }

    console.warn('No posts found in Supabase, using static fallback data')
    return fallback
  })
}

/**
 * Get a single published post by slug
 * Falls back to static data if Supabase is unavailable or returns no results
 */
export async function getPostBySlug(slug: string): Promise<PostWithRelations | null> {
  const staticFallback = (() => {
    const p = blogPosts.find(post => post.slug === slug)
    return p ? (convertStaticPostsToSupabaseFormat([p])[0] ?? null) : null
  })()
  return withSupabaseClient('getPostBySlug', staticFallback, async supabase => {
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

    if (!error && data) {
      return transformPost(data)
    }

    if (error) {
      console.error(
        'Error fetching post from Supabase, checking fallback data:',
        safeErrorLog(error)
      )
    }

    const staticPost = blogPosts.find(post => post.slug === slug)
    if (staticPost) {
      const converted = convertStaticPostsToSupabaseFormat([staticPost])
      return converted[0] || null
    }
    return null
  })
}

/**
 * Get all published post slugs for static generation
 */
export async function getAllPostSlugs(): Promise<string[]> {
  return withSupabaseClient('getAllPostSlugs', [], async supabase => {
    const { data, error } = await supabase.from('posts').select('slug').eq('status', 'published')

    if (error) {
      console.error('Error fetching slugs:', safeErrorLog(error))
      return []
    }

    return data?.map(p => p.slug) || []
  })
}

/**
 * Get posts by category slug
 */
export async function getPostsByCategory(categorySlug: string): Promise<PostWithRelations[]> {
  return withSupabaseClient('getPostsByCategory', [], async supabase => {
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
      console.error('Error fetching posts by category:', safeErrorLog(error))
      return []
    }

    return transformPosts(data || [])
  })
}

/**
 * Get posts by author slug
 */
export async function getPostsByAuthor(authorSlug: string): Promise<PostWithRelations[]> {
  return withSupabaseClient('getPostsByAuthor', [], async supabase => {
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
      console.error('Error fetching posts by author:', safeErrorLog(error))
      return []
    }

    return transformPosts(data || [])
  })
}

/**
 * Get related posts based on category and tags
 */
export async function getRelatedPosts(
  currentPost: PostWithRelations,
  limit: number = 3
): Promise<PostWithRelations[]> {
  if (!currentPost.category_id) {
    return []
  }
  return withSupabaseClient('getRelatedPosts', [], async supabase => {
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
      console.error('Error fetching related posts:', safeErrorLog(error))
      return []
    }

    return transformPosts(data || [])
  })
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  return withSupabaseClient('getAllCategories', [], async supabase => {
    const { data, error } = await supabase.from('categories').select('*').order('name')

    if (error) {
      console.error('Error fetching categories:', safeErrorLog(error))
      return []
    }

    return data || []
  })
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return withSupabaseClient('getCategoryBySlug', null, async supabase => {
    const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).single()

    if (error) {
      console.error('Error fetching category:', safeErrorLog(error))
      return null
    }

    return data
  })
}

/**
 * Get all authors
 */
export async function getAllAuthors(): Promise<Author[]> {
  return withSupabaseClient('getAllAuthors', [], async supabase => {
    const { data, error } = await supabase.from('authors').select('*').order('name')

    if (error) {
      console.error('Error fetching authors:', safeErrorLog(error))
      return []
    }

    return data || []
  })
}

/**
 * Get author by slug
 */
export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  return withSupabaseClient('getAuthorBySlug', null, async supabase => {
    const { data, error } = await supabase.from('authors').select('*').eq('slug', slug).single()

    if (error) {
      console.error('Error fetching author:', safeErrorLog(error))
      return null
    }

    return data
  })
}

/**
 * Search posts by query string
 */
export async function searchPosts(query: string): Promise<PostWithRelations[]> {
  if (!query.trim()) return []

  return withSupabaseClient('searchPosts', [], async supabase => {
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
      console.error('Error searching posts:', safeErrorLog(error))
      return []
    }

    return transformPosts(data || [])
  })
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
