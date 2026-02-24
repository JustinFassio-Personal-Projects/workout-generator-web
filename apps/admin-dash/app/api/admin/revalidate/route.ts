import { NextResponse } from 'next/server'
import { notifyMainSiteRevalidate } from '@/lib/notify-main-site'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    // Verify admin access
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { paths } = await request.json()
    const pathList = paths && Array.isArray(paths) ? paths : ['all']

    const shouldNotify =
      pathList.includes('all') ||
      pathList.includes('blog') ||
      pathList.includes('deep-research')
    if (shouldNotify) {
      notifyMainSiteRevalidate()
    }

    return NextResponse.json({ success: true, revalidated: pathList })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
