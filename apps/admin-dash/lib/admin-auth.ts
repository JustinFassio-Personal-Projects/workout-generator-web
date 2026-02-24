import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

export type AdminCookieBag = { name: string; value: string; options: Record<string, unknown> }

/** Applies admin cookie to a NextResponse so cookie-options typing lives in one place (used by login/logout routes). */
export function applyAdminCookieToResponse(res: NextResponse, cookie: AdminCookieBag): void {
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<NextResponse['cookies']['set']>[2])
}

// __Secure- prefix in production so browsers only send the cookie over HTTPS (cookie injection hardening).
const COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Secure-sb-admin-session' : 'sb-admin-session'
const MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string | null {
  const s = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SECRET
  return s && s.length >= 16 ? s : null
}

/** Signed payload (expiry.sig). Expiry in plaintext is intentional: stateless, and signature prevents tampering. Verification uses timingSafeEqual. */
function sign(expiry: number): string {
  const secret = getSecret()
  if (!secret) return ''
  const payload = `${expiry}`
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verify(value: string): boolean {
  const secret = getSecret()
  if (!secret) return false
  const i = value.indexOf('.')
  if (i <= 0) return false
  const payload = value.slice(0, i)
  const sig = value.slice(i + 1)
  const expiry = parseInt(payload, 10)
  if (Number.isNaN(expiry) || expiry < Date.now()) return false
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  if (expected.length !== sig.length) return false
  return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'))
}

/**
 * Admin auth via signed cookie. No Supabase in the auth path.
 * Set ADMIN_PASSWORD (or ADMIN_SECRET) in env; must be at least 16 chars.
 */
export async function getAdminSession(): Promise<{ ok: true } | null> {
  const secret = getSecret()
  if (!secret) return null
  const store = await cookies()
  const cookie = store.get(COOKIE_NAME)
  if (!cookie?.value) return null
  return verify(cookie.value) ? { ok: true } : null
}

export function setAdminSessionCookie(cookieDomain?: string | null): { name: string; value: string; options: Record<string, unknown> } | null {
  const secret = getSecret()
  if (!secret) return null
  const expiry = Date.now() + MAX_AGE_SEC * 1000
  const value = sign(expiry)
  if (!value) return null
  const options: Record<string, unknown> = {
    path: '/',
    maxAge: MAX_AGE_SEC,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  }
  if (cookieDomain && cookieDomain.trim()) options.domain = cookieDomain.trim()
  return {
    name: COOKIE_NAME,
    value,
    options,
  }
}

export function clearAdminSessionCookie(): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: COOKIE_NAME,
    value: '',
    options: { path: '/', maxAge: 0 },
  }
}

export function isAdminPasswordConfigured(): boolean {
  return getSecret() !== null
}

export function checkPassword(password: string): boolean {
  const secret = getSecret()
  if (!secret) return false
  const a = Buffer.from(password, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length) {
    timingSafeEqual(a, Buffer.alloc(a.length, 0))
    return false
  }
  return timingSafeEqual(a, b)
}
