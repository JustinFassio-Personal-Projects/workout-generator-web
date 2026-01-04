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

export interface PostWithRelations extends Post {
  category: Category
  author: Author
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

export interface AdminUser {
  id: string
  role: 'admin' | 'editor'
  created_at: string
}

/**
 * Form data types for admin operations
 */
export interface PostFormData {
  title: string
  slug: string
  excerpt: string
  content: string
  category_id: string
  tags: string[]
  author_id: string
  featured_image?: string
  status: 'draft' | 'published'
  seo_title?: string
  seo_description?: string
}

export interface PostCreateData extends PostFormData {
  published_at?: string
}

export interface PostUpdateData extends Partial<PostFormData> {
  published_at?: string
}

/**
 * API response types
 */
export interface PostsListResponse {
  posts: PostWithRelations[]
  categories: Category[]
  authors: Author[]
}

export interface PostResponse {
  post: PostWithRelations
}

export interface UploadResponse {
  url: string
  filename: string
}

/**
 * Stats for admin dashboard
 */
export interface BlogStats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  postsThisWeek: number
  totalCategories: number
  totalAuthors: number
}
