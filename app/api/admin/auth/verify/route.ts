import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (error) {
      // Missing Supabase admin credentials
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: adminUser, error } = await adminClient
      .from('admin_users')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (error || !adminUser) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 })
    }

    return NextResponse.json({ admin: true, role: adminUser.role })
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
