import { NextRequest, NextResponse } from 'next/server'
import {
  isAdminPasswordConfigured,
  checkPassword,
  setAdminSessionCookie,
  applyAdminCookieToResponse,
} from '@/lib/admin-auth'

/**
 * Admin login using env ADMIN_PASSWORD only. No Supabase in this path.
 * Set ADMIN_PASSWORD (min 16 chars) in .env.local.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAdminPasswordConfigured()) {
      const hint =
        process.env.VERCEL === '1'
          ? 'Add ADMIN_PASSWORD (min 16 chars) in Vercel → admin-dash project → Settings → Environment Variables, enable for Production, then redeploy.'
          : 'Set ADMIN_PASSWORD (min 16 chars) in .env.local.'
      return NextResponse.json(
        { error: `Admin login is not configured. ${hint}` },
        { status: 503 }
      )
    }

    const body = await request.json()
    const password = typeof body.password === 'string' ? body.password : ''

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const cookie = setAdminSessionCookie()
    if (!cookie) {
      return NextResponse.json({ error: 'Could not create session' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true })
    applyAdminCookieToResponse(res, cookie)
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 })
  }
}
