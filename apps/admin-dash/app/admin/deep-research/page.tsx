import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
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
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  const items = await getDeepResearchItems()
  return (
    <AdminLayout>
      <DeepResearchList initialItems={items} />
    </AdminLayout>
  )
}
