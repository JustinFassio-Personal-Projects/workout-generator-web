import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

    if (!paths || !Array.isArray(paths)) {
      // Revalidate all blog-related paths
      revalidatePath('/blog')
      revalidatePath('/sitemap.xml')
      revalidatePath('/feed.xml')
    } else {
      // Revalidate specific paths
      for (const path of paths) {
        revalidatePath(path)
      }
    }

    return NextResponse.json({ success: true, revalidated: paths || ['all'] })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
