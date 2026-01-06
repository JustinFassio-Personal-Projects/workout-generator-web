import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/support/create/route'

// Mock Supabase
const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockGetServerUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  getServerUser: () => mockGetServerUser(),
  createServerSupabaseClient: vi.fn(),
}))

// Mock fetch for Firebase Cloud Function
global.fetch = vi.fn()

describe('POST /api/support/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FIREBASE_CLOUD_FUNCTION_URL = 'https://test-function-url.com'
    mockGetServerUser.mockResolvedValue(null) // Default: anonymous user
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, ticketId: 'ticket-123' }),
      headers: new Headers(),
      redirected: false,
      statusText: '',
      type: 'default',
      url: '',
      body: null,
      bodyUsed: false,
      clone: () => ({}) as Response,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response)
  })

  it('should return 400 if subject is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Subject is required')
  })

  it('should return 400 if description is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        category: 'technical',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Description is required')
  })

  it('should return 400 if category is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'invalid',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Category must be one of')
  })

  it('should return 400 if priority is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'invalid',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Priority must be one of')
  })

  it('should return 400 if email is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: 'invalid-email',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Valid email is required')
  })

  it('should use authenticated user email if no email provided', async () => {
    mockGetServerUser.mockResolvedValue(mockUser)

    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('test@example.com'),
      })
    )
  })

  it('should create support ticket successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.ticketId).toBe('ticket-123')
    expect(global.fetch).toHaveBeenCalled()
  })

  it('should include function key in headers if configured', async () => {
    process.env.FIREBASE_FUNCTION_KEY = 'test-function-key'

    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    await POST(request)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-function-key': 'test-function-key',
        }),
      })
    )
  })

  it('should return 500 if Firebase URL is not configured', async () => {
    delete process.env.FIREBASE_CLOUD_FUNCTION_URL

    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Cloud Function URL not configured')
  })

  it('should handle Firebase Cloud Function errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Firebase error' }),
      headers: new Headers(),
      redirected: false,
      statusText: '',
      type: 'default',
      url: '',
      body: null,
      bodyUsed: false,
      clone: () => ({}) as Response,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Firebase error')
  })

  it('should handle rate limiting', async () => {
    // Use unique IP to avoid conflicts with other tests
    const uniqueIP = `192.168.1.${Math.floor(Math.random() * 255)}`
    const uniqueEmail = `ratelimit-${Date.now()}@example.com`

    // Make 5 successful requests (rate limit is 5)
    for (let i = 0; i < 5; i++) {
      const request = new NextRequest('http://localhost:3000/api/support/create', {
        method: 'POST',
        headers: {
          'x-forwarded-for': uniqueIP,
        },
        body: JSON.stringify({
          subject: `Test subject ${i}`,
          description: 'Test description',
          category: 'technical',
          priority: 'medium',
          email: uniqueEmail,
        }),
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, ticketId: `ticket-${i}` }),
        headers: new Headers(),
        redirected: false,
        statusText: '',
        type: 'default',
        url: '',
        body: null,
        bodyUsed: false,
        clone: () => ({}) as Response,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        text: async () => '',
      } as Response)

      const response = await POST(request)
      expect(response.status).toBe(200)
    }

    // 6th request should be rate limited
    const rateLimitedRequest = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      headers: {
        'x-forwarded-for': uniqueIP,
      },
      body: JSON.stringify({
        subject: 'Test subject 6',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: uniqueEmail,
      }),
    })

    const response = await POST(rateLimitedRequest)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Rate limit exceeded')
  })

  it('should handle JSON parsing errors gracefully', async () => {
    // Use unique IP/email to avoid rate limit from other tests
    const uniqueIP = `192.168.2.${Math.floor(Math.random() * 255)}`
    const uniqueEmail = `json-test-${Date.now()}@example.com`

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON')
      },
      headers: new Headers(),
      redirected: false,
      statusText: '',
      type: 'default',
      url: '',
      body: null,
      bodyUsed: false,
      clone: () => ({}) as Response,
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
      formData: async () => new FormData(),
      text: async () => '',
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/support/create', {
      method: 'POST',
      headers: {
        'x-forwarded-for': uniqueIP,
      },
      body: JSON.stringify({
        subject: 'Test subject',
        description: 'Test description',
        category: 'technical',
        priority: 'medium',
        email: uniqueEmail,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // Should still return 200 even if JSON parsing fails (empty object is returned)
    expect(response.status).toBe(200)
  })
})

describe('GET /api/support/create', () => {
  it('should return 405 Method Not Allowed', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed')
  })
})
