import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { BlogEditor } from '@/components/admin/BlogEditor'

async function getFormData() {
  const supabase = await createServerSupabaseClient()

  const { data: categories } = await supabase.from('categories').select('*').order('name')

  const { data: authors } = await supabase.from('authors').select('*').order('name')

  return {
    categories: categories || [],
    authors: authors || [],
  }
}

export default async function NewPostPage() {
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

  const { categories, authors } = await getFormData()

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <BlogEditor categories={categories} authors={authors} />
    </AdminLayout>
  )
}
