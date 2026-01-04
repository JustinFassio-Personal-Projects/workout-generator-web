import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { BlogEditor } from '@/components/admin/BlogEditor'

async function getPost(slug: string) {
  const supabase = await createServerSupabaseClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      category:categories(*),
      author:authors(*)
    `
    )
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching post:', error)
    return null
  }

  // Note: We intentionally don't filter by status here to allow admins
  // to edit both draft and published posts. Public queries filter for
  // status = 'published' only.
  return post || null
}

async function getFormData() {
  const supabase = await createServerSupabaseClient()

  const { data: categories } = await supabase.from('categories').select('*').order('name')

  const { data: authors } = await supabase.from('authors').select('*').order('name')

  return {
    categories: categories || [],
    authors: authors || [],
  }
}

interface EditPostPageProps {
  params: Promise<{ slug: string }>
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  // Auth check
  const user = await getServerUser()
  if (!user) {
    redirect('/admin/login')
  }

  const supabase = await createServerSupabaseClient()
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!adminUser) {
    redirect('/admin/login?error=unauthorized')
  }

  const { slug } = await params
  const [post, { categories, authors }] = await Promise.all([getPost(slug), getFormData()])

  if (!post) {
    notFound()
  }

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <BlogEditor post={post} categories={categories} authors={authors} />
    </AdminLayout>
  )
}
