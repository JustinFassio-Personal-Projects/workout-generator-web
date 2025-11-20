import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/chatkit-session/route'
import { NextRequest } from 'next/server'

describe('POST /api/chatkit-session', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
    global.fetch = vi.fn()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should create a ChatKit session successfully', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'
    const mockClientSecret = 'test-client-secret'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_secret: mockClientSecret }),
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'wf_test123',
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.client_secret).toBe(mockClientSecret)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chatkit/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          'OpenAI-Beta': 'chatkit_beta=v1',
        }),
      })
    )
  })

  it('should return 400 if workflowId is missing', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('workflowId is required')
  })

  it('should return 500 if OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'wf_test123',
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Server configuration error')
  })

  it('should handle OpenAI API errors', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'wf_test123',
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Failed to create ChatKit session')
  })

  it('should use anonymous user if userId is not provided', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'
    const mockClientSecret = 'test-client-secret'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_secret: mockClientSecret }),
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'wf_test123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.client_secret).toBe(mockClientSecret)

    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1]?.body as string)
    expect(requestBody.user).toBe('anonymous')
  })

  it('should handle network errors', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'wf_test123',
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
