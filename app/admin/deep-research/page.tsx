import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { DeepResearchList } from '@/components/admin/DeepResearchList'
import type { DeepResearch } from '@/types/deep-research'

async function getDeepResearchItems(): Promise<DeepResearch[]> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('deep_research')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Deep Research]', error.message || error)
      return []
    }

    return (data || []) as DeepResearch[]
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Deep Research]', message)
    return []
  }
}

export default async function AdminDeepResearchPage() {
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

  const items = await getDeepResearchItems()

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <DeepResearchList initialItems={items} />
    </AdminLayout>
  )
}
