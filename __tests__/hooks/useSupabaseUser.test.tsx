import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import type { User } from '@supabase/supabase-js'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        mockOnAuthStateChange(callback)
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        }
      },
    },
  }),
}))

describe('useSupabaseUser', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
  } as User

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return loading state initially', () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    const { result } = renderHook(() => useSupabaseUser())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should return user when authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    const { result } = renderHook(() => useSupabaseUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.error).toBe(null)
  })

  it('should return null user when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    const { result } = renderHook(() => useSupabaseUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should handle getUser error', async () => {
    const mockError = { message: 'Failed to get user', status: 500 }
    mockGetUser.mockResolvedValue({ data: { user: null }, error: mockError })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    const { result } = renderHook(() => useSupabaseUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBe(null)
    expect(result.current.error).toEqual(mockError)
  })

  it('should update user on auth state change', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    let authStateCallback: ((event: string, session: any) => void) | null = null
    mockOnAuthStateChange.mockImplementation(callback => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    const { result } = renderHook(() => useSupabaseUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate auth state change
    if (authStateCallback) {
      ;(authStateCallback as (event: string, session: any) => void)('SIGNED_IN', { user: mockUser })
    }

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  it('should handle sign out in auth state change', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    let authStateCallback: ((event: string, session: any) => void) | null = null
    mockOnAuthStateChange.mockImplementation(callback => {
      authStateCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    })

    const { result } = renderHook(() => useSupabaseUser())

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })

    // Simulate sign out
    if (authStateCallback) {
      ;(authStateCallback as (event: string, session: any) => void)('SIGNED_OUT', null)
    }

    await waitFor(() => {
      expect(result.current.user).toBe(null)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  it('should set up auth state listener', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    renderHook(() => useSupabaseUser())

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })
  })
})
