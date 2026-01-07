import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
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

  const leads = await getLeads()

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <LeadList initialLeads={leads} />
    </AdminLayout>
  )
}
