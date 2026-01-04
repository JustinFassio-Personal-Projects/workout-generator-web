import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use admin client to bypass RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createClient(url, serviceKey)
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const adminClient = getAdminClient()

    if (!adminClient) {
      // Fallback: If no service key, try direct query (less secure but works for dev)
      // In production, service role key should always be set
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
