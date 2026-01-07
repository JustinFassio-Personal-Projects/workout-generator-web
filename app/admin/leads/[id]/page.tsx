import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { LeadDetail } from '@/components/admin/LeadDetail'
import { AdminLeadWithRelations } from '@/types/admin'

async function getLead(id: string): Promise<AdminLeadWithRelations | null> {
  const adminClient = createAdminClient()

  // Fetch lead
  const { data: lead, error: leadError } = await adminClient
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return null
  }

  // Fetch related vision_lead_intel
  const { data: visionLeadIntel } = await adminClient
    .from('vision_lead_intel')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  // Fetch related exercise_submissions
  const { data: exerciseSubmissions } = await adminClient
    .from('exercise_submissions')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  return {
    ...lead,
    vision_lead_intel: visionLeadIntel || undefined,
    exercise_submissions: exerciseSubmissions || undefined,
  } as AdminLeadWithRelations
}

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
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

  const { id } = await params
  const lead = await getLead(id)

  if (!lead) {
    notFound()
  }

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <LeadDetail lead={lead} />
    </AdminLayout>
  )
}
