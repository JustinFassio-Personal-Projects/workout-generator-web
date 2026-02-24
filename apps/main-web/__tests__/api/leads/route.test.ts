import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/leads/route'

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => mockSupabaseClient),
}))

// Mock fetch for Turnstile verification
global.fetch = vi.fn()

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key'
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)
  })

  it('should return 400 if first name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        turnstile_token: 'test-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('First name is required')
  })

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        turnstile_token: 'test-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email is required')
  })

  it('should return 400 if email is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        email: 'invalid-email',
        turnstile_token: 'test-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
  })

  it('should return 400 if turnstile token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Captcha verification is required')
  })

  it('should return 400 if Turnstile verification fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        email: 'test@example.com',
        turnstile_token: 'invalid-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Captcha verification failed')
  })

  it('should create a new lead successfully', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: null })
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        email: 'test@example.com',
        turnstile_token: 'valid-token',
        consent_email_plan: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.lead_id).toBe('lead-123')
  })

  it('should return existing lead if email already exists', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'existing-lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        email: 'existing@example.com',
        turnstile_token: 'valid-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.lead_id).toBe('existing-lead-123')
    expect(data.message).toBe('Lead already exists')
  })

  it('should handle server errors gracefully', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: null })
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    })

    const request = new NextRequest('http://localhost:3000/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Test',
        email: 'test@example.com',
        turnstile_token: 'valid-token',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create lead')
  })
})

describe('GET /api/leads', () => {
  it('should return 405 Method Not Allowed', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed')
  })
})
