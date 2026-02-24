import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAdminSession } from '@/lib/admin-auth'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LeadList } from '@/components/admin/LeadList'
import { AdminLead } from '@/types/admin'

async function getLeads(): Promise<AdminLead[]> {
  const supabase = await createServerSupabaseClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return (leads || []) as AdminLead[]
}

export default async function AdminLeadsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const leads = await getLeads()

  return (
    <AdminLayout>
      <LeadList initialLeads={leads} />
    </AdminLayout>
  )
}
