import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

// Mock BotID before importing the route
const mockCheckBotId = vi.fn(async () => ({ isBot: false }))
vi.mock('botid/server', () => ({
  checkBotId: () => mockCheckBotId(),
}))

// Import after mock
import { POST } from '@/app/api/chatkit-session/route'

describe('POST /api/chatkit-session', () => {
  const originalEnv = process.env

  beforeAll(() => {
    // Set test API key before all tests
    process.env.OPENAI_API_KEY = 'test-api-key-for-testing-only'
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
    // Reset process.env but ensure we can set test values
    process.env = { ...originalEnv }
    // Always set a default test API key for tests
    process.env.OPENAI_API_KEY = 'test-api-key-for-testing-only'
    global.fetch = vi.fn()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  afterAll(() => {
    // Restore original env
    process.env = originalEnv
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

  it('should return 403 if bot is detected', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'
    mockCheckBotId.mockResolvedValueOnce({ isBot: true })

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: 'wf_test123',
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Bot detected. Access denied.')
    expect(global.fetch).not.toHaveBeenCalled()
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
    // Temporarily remove the API key for this test
    const originalKey = process.env.OPENAI_API_KEY
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

    // Restore the API key
    if (originalKey) {
      process.env.OPENAI_API_KEY = originalKey
    }
  })

  it('should handle OpenAI API errors', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
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
    expect(data.details).toBe('Unauthorized')
    expect(data.status).toBe(401)
  })

  it('should handle different error status codes', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limit exceeded',
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

    expect(response.status).toBe(429)
    expect(data.error).toBe('Failed to create ChatKit session')
    expect(data.details).toBe('Rate limit exceeded')
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

  it('should handle JSON parsing errors in request body', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle empty request body', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('workflowId is required')
  })

  it('should handle null userId', async () => {
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
        userId: null,
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

  it('should handle empty string workflowId', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key'

    const request = new NextRequest('http://localhost:3000/api/chatkit-session', {
      method: 'POST',
      body: JSON.stringify({
        workflowId: '',
        userId: 'user123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('workflowId is required')
  })
})
