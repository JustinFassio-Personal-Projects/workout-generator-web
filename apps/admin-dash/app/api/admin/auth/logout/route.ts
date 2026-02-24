import { NextResponse } from 'next/server'
import { clearAdminSessionCookie, applyAdminCookieToResponse } from '@/lib/admin-auth'

export async function POST() {
  const cookie = clearAdminSessionCookie()
  const res = NextResponse.json({ success: true })
  applyAdminCookieToResponse(res, cookie)
  return res
}
