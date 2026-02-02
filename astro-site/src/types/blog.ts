/**
 * Blog system types for Supabase integration
 */

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category_id: string | null
  tags: string[]
  author_id: string | null
  featured_image: string | null
  status: 'draft' | 'published'
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string

  // Joined relations (populated when fetching with joins)
  category?: Category
  author?: Author
}

export interface PostWithRelations extends Omit<Post, 'category' | 'author'> {
  category: Category | null
  author: Author | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export interface Author {
  id: string
  name: string
  slug: string
  bio: string | null
  avatar: string | null
  created_at: string
}

/**
 * Transformed post format for components
 */
export interface TransformedPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  date: string
  dateModified: string
  author: string
  category: string
  tags: string[]
  image?: string
}
