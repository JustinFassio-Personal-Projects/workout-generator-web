import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AstroCookies } from 'astro'
import type { PostWithRelations, Category, Author, TransformedPost } from '@/types/blog'
import { fallbackPosts } from '@/data/blog/fallback-posts'

const baseUrl = import.meta.env.PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

/**
 * Transform Supabase post data to handle joined relations.
 * Supabase returns joined relations as arrays, but we need single objects.
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
 * Convert PostWithRelations to TransformedPost format for components
 */
export function toTransformedPost(post: PostWithRelations): TransformedPost {
  const publishedDate = post.published_at || post.created_at
  const normalizedDate = publishedDate
    ? new Date(publishedDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    date: normalizedDate,
    dateModified: post.updated_at
      ? new Date(post.updated_at).toISOString().split('T')[0]
      : normalizedDate,
    author: post.author?.name || 'Unknown',
    category: post.category?.name || 'Uncategorized',
    tags: post.tags || [],
    image: post.featured_image || undefined,
  }
}

/**
 * Convert static blog posts to PostWithRelations format (fallback when Supabase is unavailable)
 */
function convertStaticPostsToSupabaseFormat(staticPosts: TransformedPost[]): PostWithRelations[] {
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

    return {
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
  })
}

/**
 * Get all published posts with their relations
 * Falls back to static data if Supabase is unavailable or returns no results
 */
export async function getAllPublishedPosts(cookies: AstroCookies): Promise<PostWithRelations[]> {
  try {
    const supabase = createServerSupabaseClient(cookies)

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
      console.error('Error fetching posts from Supabase, using fallback data:', error)
      return convertStaticPostsToSupabaseFormat(fallbackPosts)
    }

    // If Supabase returns data, use it; otherwise fall back to static data
    if (data && data.length > 0) {
      return transformPosts(data)
    }

    // No data in Supabase, use static fallback
    console.warn('No posts found in Supabase, using static fallback data')
    return convertStaticPostsToSupabaseFormat(fallbackPosts)
  } catch (error) {
    // If Supabase client creation fails, use static data
    console.error('Failed to connect to Supabase, using fallback data:', error)
    return convertStaticPostsToSupabaseFormat(fallbackPosts)
  }
}

/**
 * Get a single published post by slug
 * Falls back to static data if Supabase is unavailable or returns no results
 */
export async function getPostBySlug(
  slug: string,
  cookies: AstroCookies
): Promise<PostWithRelations | null> {
  try {
    const supabase = createServerSupabaseClient(cookies)

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

    // If Supabase fails or returns no data, fall back to static data
    if (error) {
      console.error('Error fetching post from Supabase, checking fallback data:', error)
    }

    // Check static fallback data
    const staticPost = fallbackPosts.find(post => post.slug === slug)
    if (staticPost) {
      const converted = convertStaticPostsToSupabaseFormat([staticPost])
      return converted[0] || null
    }

    return null
  } catch (error) {
    // If Supabase client creation fails, use static data
    console.error('Failed to connect to Supabase, checking fallback data:', error)
    const staticPost = fallbackPosts.find(post => post.slug === slug)
    if (staticPost) {
      const converted = convertStaticPostsToSupabaseFormat([staticPost])
      return converted[0] || null
    }
    return null
  }
}

/**
 * Get related posts based on category
 */
export async function getRelatedPosts(
  currentPost: PostWithRelations,
  cookies: AstroCookies,
  limit: number = 3
): Promise<PostWithRelations[]> {
  try {
    const supabase = createServerSupabaseClient(cookies)

    // If post has no category, return empty array
    if (!currentPost.category_id) {
      return []
    }

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
  } catch (error) {
    console.error('Failed to fetch related posts:', error)
    return []
  }
}

/**
 * Get all categories
 */
export async function getAllCategories(cookies: AstroCookies): Promise<Category[]> {
  try {
    const supabase = createServerSupabaseClient(cookies)

    const { data, error } = await supabase.from('categories').select('*').order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}
