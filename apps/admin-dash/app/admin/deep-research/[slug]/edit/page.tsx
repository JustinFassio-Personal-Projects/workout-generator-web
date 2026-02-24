import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminSession } from '@/lib/admin-auth'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { DeepResearchEditor } from '@/components/admin/DeepResearchEditor'
import type { DeepResearch } from '@/types/deep-research'

async function getDeepResearchItem(slug: string): Promise<DeepResearch | null> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('deep_research')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    return null
  }

  return (data || null) as DeepResearch
}

interface EditDeepResearchPageProps {
  params: Promise<{ slug: string }>
}

export default async function EditDeepResearchPage({ params }: EditDeepResearchPageProps) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  const { slug } = await params
  const item = await getDeepResearchItem(slug)
  if (!item) notFound()
  return (
    <AdminLayout user={{ id: 'admin', email: 'admin' }} role="admin">
      <DeepResearchEditor item={item} />
    </AdminLayout>
  )
}
