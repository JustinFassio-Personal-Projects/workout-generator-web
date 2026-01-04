import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BlogList } from '@/components/admin/BlogList'
import { Category } from '@/types/blog'

interface PostRow {
  id: string
  slug: string
  title: string
  excerpt: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
  category: { id: string; name: string; slug: string } | null
  author: { id: string; name: string } | null
}

async function getPosts() {
  const supabase = await createServerSupabaseClient()

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      id,
      slug,
      title,
      excerpt,
      status,
      published_at,
      created_at,
      updated_at,
      category:categories(id, name, slug),
      author:authors(id, name)
    `
    )
    .order('updated_at', { ascending: false })

  const { data: categories } = await supabase.from('categories').select('*').order('name')

  // Transform the data to handle Supabase's array return for single relations
  const transformedPosts: PostRow[] = (posts || []).map((post: Record<string, unknown>) => ({
    id: post.id as string,
    slug: post.slug as string,
    title: post.title as string,
    excerpt: post.excerpt as string,
    status: post.status as 'draft' | 'published',
    published_at: post.published_at as string | null,
    created_at: post.created_at as string,
    updated_at: post.updated_at as string,
    category: Array.isArray(post.category)
      ? post.category[0] || null
      : (post.category as { id: string; name: string; slug: string } | null),
    author: Array.isArray(post.author)
      ? post.author[0] || null
      : (post.author as { id: string; name: string } | null),
  }))

  return {
    posts: transformedPosts,
    categories: (categories || []) as Category[],
  }
}

export default async function AdminBlogPage() {
  const { posts, categories } = await getPosts()

  return <BlogList initialPosts={posts} categories={categories} />
}
