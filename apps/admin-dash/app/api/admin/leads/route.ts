import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// GET: List all leads
export async function GET(request: Request) {
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

    // Use admin client to bypass RLS and get all leads
    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)

    const source = searchParams.get('source')
    const verified = searchParams.get('verified')
    const search = searchParams.get('search')

    let query = adminClient.from('leads').select('*').order('created_at', { ascending: false })

    if (source && source !== 'all') {
      query = query.eq('source', source)
    }

    if (verified && verified !== 'all') {
      query = query.eq('verified', verified === 'verified')
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: leads, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
