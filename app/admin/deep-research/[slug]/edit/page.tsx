import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
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
  const item = await getDeepResearchItem(slug)

  if (!item) {
    notFound()
  }

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <DeepResearchEditor item={item} />
    </AdminLayout>
  )
}
