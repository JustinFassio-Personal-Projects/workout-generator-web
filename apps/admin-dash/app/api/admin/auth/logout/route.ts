import { NextResponse } from 'next/server'
import { clearAdminSessionCookie } from '@/lib/admin-auth'

export async function POST() {
  const cookie = clearAdminSessionCookie()
  const res = NextResponse.json({ success: true })
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<NextResponse['cookies']['set']>[2])
  return res
}
