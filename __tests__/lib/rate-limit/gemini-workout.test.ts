import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { checkGeminiRateLimit, setGeminiRateLimit } from '@/lib/rate-limit/gemini-workout'

describe('gemini-workout rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkGeminiRateLimit', () => {
    it('should return false when no cookie is present', () => {
      const request = new NextRequest('http://localhost:3000/api/reports/gemini-workout', {
        method: 'POST',
      })

      const result = checkGeminiRateLimit(request)
      expect(result).toBe(false)
    })

    it('should return false when cookie value is not "true"', () => {
      const request = new NextRequest('http://localhost:3000/api/reports/gemini-workout', {
        method: 'POST',
        headers: {
          cookie: 'gemini_workout_used=false',
        },
      })

      const result = checkGeminiRateLimit(request)
      expect(result).toBe(false)
    })

    it('should return true when cookie value is "true"', () => {
      const request = new NextRequest('http://localhost:3000/api/reports/gemini-workout', {
        method: 'POST',
        headers: {
          cookie: 'gemini_workout_used=true',
        },
      })

      const result = checkGeminiRateLimit(request)
      expect(result).toBe(true)
    })
  })

  describe('setGeminiRateLimit', () => {
    it('should set the rate limit cookie with correct properties', () => {
      const response = NextResponse.json({ workout: 'test workout' })
      const originalEnv = process.env.NODE_ENV

      // Test in development mode
      process.env.NODE_ENV = 'development'
      const result = setGeminiRateLimit(response)

      expect(result).toBe(response)
      const cookies = result.cookies.getAll()
      const cookie = cookies.find(c => c.name === 'gemini_workout_used')

      expect(cookie).toBeDefined()
      expect(cookie?.value).toBe('true')
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.secure).toBe(false) // Not secure in development
      expect(cookie?.sameSite).toBe('strict')
      expect(cookie?.path).toBe('/')

      // Restore original env
      process.env.NODE_ENV = originalEnv
    })

    it('should set secure flag to true in production', () => {
      const response = NextResponse.json({ workout: 'test workout' })
      const originalEnv = process.env.NODE_ENV

      process.env.NODE_ENV = 'production'
      const result = setGeminiRateLimit(response)

      const cookies = result.cookies.getAll()
      const cookie = cookies.find(c => c.name === 'gemini_workout_used')

      expect(cookie?.secure).toBe(true) // Secure in production

      // Restore original env
      process.env.NODE_ENV = originalEnv
    })

    it('should set cookie with future expiration date', () => {
      const response = NextResponse.json({ workout: 'test workout' })
      const beforeTime = Date.now()

      const result = setGeminiRateLimit(response)
      const cookies = result.cookies.getAll()
      const cookie = cookies.find(c => c.name === 'gemini_workout_used')

      expect(cookie?.expires).toBeDefined()
      if (cookie?.expires) {
        const expiryTime = new Date(cookie.expires).getTime()
        const expectedExpiry = beforeTime + 24 * 60 * 60 * 1000 // 24 hours
        // Allow 1 second tolerance
        expect(expiryTime).toBeGreaterThan(beforeTime)
        expect(expiryTime).toBeCloseTo(expectedExpiry, -3) // Within 1 second
      }
    })
  })
})
