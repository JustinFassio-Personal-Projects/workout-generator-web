import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCheckBotId = vi.fn(async () => ({ isBot: false }))
vi.mock('botid/server', () => ({
  checkBotId: () => mockCheckBotId(),
}))

const mockCreateAdminClient = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

import { POST } from '@/app/api/analytics/collect/route'

type MockAdmin = {
  from: (table: string) => any
}

function makeMockAdmin(overrides?: {
  sessionsUpdateReturns?: Array<{ session_id: string }>
}): MockAdmin {
  const sessionsUpdateReturns = overrides?.sessionsUpdateReturns ?? [
    { session_id: '00000000-0000-4000-8000-000000000001' },
  ]

  return {
    from(table: string) {
      if (table === 'analytics_visitors') {
        return {
          upsert: vi.fn(async () => ({ error: null })),
        }
      }

      if (table === 'analytics_sessions') {
        return {
          insert: vi.fn(async () => ({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(async () => ({ data: sessionsUpdateReturns, error: null })),
            })),
          })),
        }
      }

      if (table === 'analytics_events') {
        return {
          insert: vi.fn(async () => ({ error: null })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }
}

function getSetCookieHeader(response: Response): string {
  // Node fetch / NextResponse: may return multiple set-cookie headers combined.
  return response.headers.get('set-cookie') || ''
}

describe('POST /api/analytics/collect', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockCreateAdminClient.mockReturnValue(makeMockAdmin())
  })

  it('returns 204 when DNT is enabled', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      headers: {
        dnt: '1',
      },
      body: JSON.stringify({ type: 'page_view', path: '/' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(204)
  })

  it('returns 204 for prefetch requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      headers: {
        purpose: 'prefetch',
      },
      body: JSON.stringify({ type: 'page_view', path: '/' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(204)
  })

  it('returns 204 when bot is detected', async () => {
    mockCheckBotId.mockResolvedValueOnce({ isBot: true })

    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({ type: 'page_view', path: '/' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(204)
  })

  it('returns 400 for invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: 'not-json',
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid JSON payload')
  })

  it('returns 400 for invalid event type', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({ type: 'nope', path: '/' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid event type')
  })

  it('returns 204 for excluded paths (admin)', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({ type: 'page_view', path: '/admin' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(204)
  })

  it('returns 400 for click events missing click_name', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({ type: 'click', path: '/onboard' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('click_name is required for click events')
  })

  it('records page_view and sets visitor/session cookies when new', async () => {
    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({
        type: 'page_view',
        path: '/onboard',
        href: 'https://aiworkoutgenerator.com/onboard',
        referrer: 'https://google.com',
        meta: { utm_source: 'google' },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(204)

    const setCookie = getSetCookieHeader(response)
    expect(setCookie).toContain('wg_vid=')
    expect(setCookie).toContain('wg_sid=')
  })

  it('updates existing session when cookies are present', async () => {
    const admin = makeMockAdmin({
      sessionsUpdateReturns: [{ session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
    })
    mockCreateAdminClient.mockReturnValueOnce(admin)

    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      headers: {
        cookie:
          'wg_vid=11111111-1111-4111-8111-111111111111; wg_sid=22222222-2222-4222-8222-222222222222',
      },
      body: JSON.stringify({
        type: 'page_view',
        path: '/onboard',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(204)

    // Session cookie should still be refreshed
    const setCookie = getSetCookieHeader(response)
    expect(setCookie).toContain('wg_sid=22222222-2222-4222-8222-222222222222')
  })

  it('returns 500 if Supabase admin client is not configured', async () => {
    mockCreateAdminClient.mockImplementationOnce(() => {
      throw new Error('Missing Supabase admin credentials')
    })

    const request = new NextRequest('http://localhost:3000/api/analytics/collect', {
      method: 'POST',
      body: JSON.stringify({ type: 'page_view', path: '/' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Server configuration error')
  })
})
