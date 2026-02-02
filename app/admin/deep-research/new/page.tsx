import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { DeepResearchEditor } from '@/components/admin/DeepResearchEditor'

export default async function NewDeepResearchPage() {
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

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <DeepResearchEditor />
    </AdminLayout>
  )
}
