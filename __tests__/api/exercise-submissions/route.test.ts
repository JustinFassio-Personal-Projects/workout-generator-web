import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/exercise-submissions/route'

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

describe('POST /api/exercise-submissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mock implementations to return the chain
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.single.mockReset()
  })

  it('should return 400 if lead_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        exercise_name: 'Push Up',
        category: 'strength',
        equipment: 'none',
        primary_muscles: ['chest'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Lead ID is required')
  })

  it('should return 400 if exercise name is invalid', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        exercise_name: '',
        category: 'strength',
        equipment: 'none',
        primary_muscles: ['chest'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Exercise name is required')
  })

  it('should return 400 if category is invalid', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        exercise_name: 'Push Up',
        category: 'invalid',
        equipment: 'none',
        primary_muscles: ['chest'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid category')
  })

  it('should return 400 if primary muscles array is empty', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        exercise_name: 'Push Up',
        category: 'strength',
        equipment: 'none',
        primary_muscles: [],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('At least one primary muscle group is required')
  })

  it('should return 400 if technique cues are too short', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        exercise_name: 'Push Up',
        category: 'strength',
        equipment: 'none',
        primary_muscles: ['chest'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Short',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Technique cues are required')
  })

  it('should return 400 if lead does not exist', async () => {
    // Mock the lead check to return error (lead doesn't exist)
    // This is the first .single() call (checking if lead exists)
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'invalid-lead',
        exercise_name: 'Push Up',
        category: 'strength',
        equipment: 'none',
        primary_muscles: ['chest'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid lead ID')
    // Verify the lead check was called
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('leads')
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1)
  })

  it('should create exercise submission successfully', async () => {
    // First .single() call: verify lead exists
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })
    // Second .single() call: insert submission and return it
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'submission-123' },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        exercise_name: 'Push Up',
        category: 'strength',
        equipment: 'none',
        primary_muscles: ['chest', 'triceps'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.submission_id).toBe('submission-123')
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(2)
  })

  it('should handle server errors gracefully', async () => {
    // First .single() call: verify lead exists (success)
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'lead-123' },
      error: null,
    })
    // Second .single() call: insert submission fails (returns error)
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    })

    const request = new NextRequest('http://localhost:3000/api/exercise-submissions', {
      method: 'POST',
      body: JSON.stringify({
        lead_id: 'lead-123',
        exercise_name: 'Push Up',
        category: 'strength',
        equipment: 'none',
        primary_muscles: ['chest'],
        movement_pattern: 'push',
        difficulty: 'beginner',
        technique_cues: 'Keep your body straight and lower yourself down.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create exercise submission')
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(2)
  })
})

describe('GET /api/exercise-submissions', () => {
  it('should return 405 Method Not Allowed', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(405)
    expect(data.error).toBe('Method not allowed')
  })
})
