import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/vision-lead-intel/route'

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

describe('POST /api/vision-lead-intel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.single.mockReset()
  })

  it('should return 400 if lead_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Lead ID is required')
  })

  it('should return 400 if goal_primary is missing', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Goal is required')
  })

  it('should return 400 if frustration_primary is missing', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        goal_primary: 'Build muscle',
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Frustration is required')
  })

  it('should return 400 if ai_expectation_primary is missing', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('AI expectation is required')
  })

  it('should return 400 if expectation_free_text exceeds 500 characters', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
        expectation_free_text: 'A'.repeat(501),
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Free text must be 500 characters or less')
  })

  it('should return 400 if lead does not exist', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'invalid-lead',
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid lead ID')
  })

  it('should create vision lead intel successfully', async () => {
    // First call: verify lead exists
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })
    // Second call: insert intel
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'intel-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
        payment_trigger_primary: 'Clear progression plan',
        expectation_free_text: 'I want a simple plan',
        exercise_suggestion: 'Sled push',
        vision_prompt: 'Push up',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.intel_id).toBe('intel-123')
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(2)
  })

  it('should create vision lead intel with only required fields', async () => {
    // First call: verify lead exists
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })
    // Second call: insert intel
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'intel-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.intel_id).toBe('intel-123')
  })

  it('should handle server errors gracefully', async () => {
    // First call: verify lead exists
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })
    // Second call: insert fails
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    })

    const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save responses')
  })

  it('should handle rate limiting', async () => {
    const leadId = `lead-rate-limit-${Date.now()}`
    const uniqueIP = `192.168.1.${Math.floor(Math.random() * 255)}`

    // Make 3 successful requests (rate limit is 3)
    for (let i = 0; i < 3; i++) {
      const request = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
        method: 'POST',
        headers: {
          'x-forwarded-for': uniqueIP,
        },
        body: JSON.stringify({
          lead_id: leadId,
          goal_primary: 'Build muscle',
          frustration_primary: "I don't know what to do",
          ai_expectation_primary: 'Build a plan with week-to-week progression',
        }),
      })

      // First call: verify lead exists
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: leadId },
        error: null,
      })
      // Second call: insert intel
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: `intel-${i}` },
        error: null,
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    }

    // 4th request should be rate limited
    const rateLimitedRequest = new NextRequest('http://localhost:3000/api/vision-lead-intel', {
      method: 'POST',
      headers: {
        'x-forwarded-for': uniqueIP,
      },
      body: JSON.stringify({
        lead_id: leadId,
        goal_primary: 'Build muscle',
        frustration_primary: "I don't know what to do",
        ai_expectation_primary: 'Build a plan with week-to-week progression',
      }),
    })

    // Lead check still happens before rate limit check
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: leadId },
      error: null,
    })

    const response = await POST(rateLimitedRequest)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Rate limit exceeded')
  })
})

describe('GET /api/vision-lead-intel', () => {
  it('should return 405 Method Not Allowed', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed')
  })
})
