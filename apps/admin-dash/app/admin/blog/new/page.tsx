import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
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
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { categories, authors } = await getFormData()

  return (
    <AdminLayout user={{ id: 'admin', email: 'admin' }} role="admin">
      <BlogEditor categories={categories} authors={authors} />
    </AdminLayout>
  )
}
