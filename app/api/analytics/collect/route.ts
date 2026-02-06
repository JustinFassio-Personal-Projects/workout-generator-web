import { NextRequest, NextResponse } from 'next/server'
import { checkBotId } from 'botid/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

type EventType = 'page_view' | 'click'

type CollectPayload = {
  type: EventType
  path: string
  href?: string
  referrer?: string
  click_name?: string
  meta?: Record<string, unknown>
}

const VISITOR_COOKIE = 'wg_vid'
const SESSION_COOKIE = 'wg_sid'
const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 400 // ~13 months
const SESSION_MAX_AGE_SECONDS = 60 * 30 // 30 minutes rolling session

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed
}

function isTrackablePath(path: string): boolean {
  // Hard excludes (do not collect analytics)
  if (!path.startsWith('/')) return false
  if (path.startsWith('/admin')) return false
  if (path.startsWith('/api')) return false
  if (path.startsWith('/_next')) return false
  if (path === '/favicon.ico') return false
  if (path.startsWith('/robots')) return false
  if (path.startsWith('/sitemap')) return false
  if (path.startsWith('/feed.xml')) return false
  return true
}

function getUtm(meta: Record<string, unknown> | undefined) {
  return {
    utm_source: normalizeText(meta?.utm_source, 200),
    utm_medium: normalizeText(meta?.utm_medium, 200),
    utm_campaign: normalizeText(meta?.utm_campaign, 200),
    utm_term: normalizeText(meta?.utm_term, 200),
    utm_content: normalizeText(meta?.utm_content, 200),
  }
}

export async function POST(request: NextRequest) {
  // Respect Do Not Track
  const dnt = request.headers.get('dnt')
  if (dnt === '1') {
    return new NextResponse(null, { status: 204 })
  }

  // Avoid counting browser/link prefetch
  const purpose = request.headers.get('purpose') || request.headers.get('sec-purpose')
  if (purpose && purpose.toLowerCase().includes('prefetch')) {
    return new NextResponse(null, { status: 204 })
  }

  // Drop bots (BotID)
  try {
    const verification = await checkBotId()
    if (verification.isBot) {
      return new NextResponse(null, { status: 204 })
    }
  } catch {
    // If BotID fails closed here, it could break analytics entirely. Fail open but keep payload strict.
  }

  let payload: CollectPayload
  try {
    payload = (await request.json()) as CollectPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const type: EventType | undefined =
    payload?.type === 'page_view' || payload?.type === 'click' ? payload.type : undefined
  const path = normalizeText(payload?.path, 2048)
  const href = normalizeText(payload?.href, 2048)
  const referrer = normalizeText(payload?.referrer, 2048)
  const clickName = normalizeText(payload?.click_name, 255)
  const meta =
    payload?.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)
      ? payload.meta
      : undefined

  if (!type) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
  }
  if (!path || !isTrackablePath(path)) {
    return new NextResponse(null, { status: 204 })
  }
  if (type === 'click' && !clickName) {
    return NextResponse.json({ error: 'click_name is required for click events' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()

  // Cookies for visitor/session identity (first-party)
  const incomingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value
  const incomingSessionId = request.cookies.get(SESSION_COOKIE)?.value

  const visitorId = isUuid(incomingVisitorId) ? incomingVisitorId : randomUUID()
  const sessionId = isUuid(incomingSessionId) ? incomingSessionId : randomUUID()

  const isNewVisitor = !isUuid(incomingVisitorId)
  const isNewSession = !isUuid(incomingSessionId)

  // Persist to Supabase (service role)
  try {
    const admin = createAdminClient()

    // Upsert visitor (first_seen_at remains default for inserts)
    const { error: visitorError } = await admin
      .from('analytics_visitors')
      .upsert({ visitor_id: visitorId, last_seen_at: nowIso }, { onConflict: 'visitor_id' })
    if (visitorError) {
      return NextResponse.json({ error: 'Failed to record visitor' }, { status: 500 })
    }

    // Create or refresh session
    const utm = getUtm(meta)
    if (isNewSession) {
      const { error: sessionInsertError } = await admin.from('analytics_sessions').insert({
        session_id: sessionId,
        visitor_id: visitorId,
        last_seen_at: nowIso,
        entry_path: path,
        referrer,
        ...utm,
      })
      if (sessionInsertError) {
        return NextResponse.json({ error: 'Failed to record session' }, { status: 500 })
      }
    } else {
      const { data: sessionUpdated, error: sessionUpdateError } = await admin
        .from('analytics_sessions')
        .update({ last_seen_at: nowIso })
        .eq('session_id', sessionId)
        .select('session_id')

      if (sessionUpdateError) {
        return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
      }

      // If the session cookie exists but the row doesn't (e.g. new deploy), insert a minimal row.
      if (!sessionUpdated || sessionUpdated.length === 0) {
        const { error: sessionInsertError } = await admin.from('analytics_sessions').insert({
          session_id: sessionId,
          visitor_id: visitorId,
          last_seen_at: nowIso,
          entry_path: path,
          referrer,
          ...utm,
        })
        if (sessionInsertError) {
          return NextResponse.json({ error: 'Failed to record session' }, { status: 500 })
        }
      }
    }

    // Record event
    const { error: eventError } = await admin.from('analytics_events').insert({
      occurred_at: nowIso,
      visitor_id: visitorId,
      session_id: sessionId,
      type,
      path,
      href,
      referrer,
      click_name: type === 'click' ? clickName : null,
      props: meta ?? null,
    })

    if (eventError) {
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
    }
  } catch {
    // Supabase missing (env/tables) or other config; return 500 so monitoring can detect misconfiguration.
    // Client already ignores errors (sendBeacon/fetch.catch) and does not break the page.
    console.error('Analytics collect: server configuration error')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const response = new NextResponse(null, { status: 204 })
  const secure = process.env.NODE_ENV === 'production'

  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: VISITOR_MAX_AGE_SECONDS,
    })
  }

  // Always refresh session cookie for rolling expiry
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return response
}
