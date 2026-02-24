import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { DeepResearchEditor } from '@/components/admin/DeepResearchEditor'

export default async function NewDeepResearchPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return (
    <AdminLayout>
      <DeepResearchEditor />
    </AdminLayout>
  )
}
