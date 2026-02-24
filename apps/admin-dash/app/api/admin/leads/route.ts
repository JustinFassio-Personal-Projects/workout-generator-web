import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: List all leads
export async function GET(request: Request) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
