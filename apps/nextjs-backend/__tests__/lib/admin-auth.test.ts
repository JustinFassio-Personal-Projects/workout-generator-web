import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setAdminSessionCookie,
  clearAdminSessionCookie,
  isAdminPasswordConfigured,
  checkPassword,
  getAdminSession,
} from '@/lib/admin-auth'

const MIN_PASSWORD = 'a'.repeat(16)

const mockCookiesGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookiesGet,
    })
  ),
}))

describe('admin-auth', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.ADMIN_PASSWORD
    delete process.env.ADMIN_SECRET
    mockCookiesGet.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('clearAdminSessionCookie', () => {
    it('should return cookie config to clear the session', () => {
      const result = clearAdminSessionCookie()
      expect(result).toEqual({
        name: 'sb-admin-session',
        value: '',
        options: { path: '/', maxAge: 0 },
      })
    })
  })

  describe('isAdminPasswordConfigured', () => {
    it('should return false when ADMIN_PASSWORD is not set', () => {
      expect(isAdminPasswordConfigured()).toBe(false)
    })

    it('should return false when ADMIN_PASSWORD is shorter than 16 chars', () => {
      process.env.ADMIN_PASSWORD = 'short'
      expect(isAdminPasswordConfigured()).toBe(false)
    })

    it('should return true when ADMIN_PASSWORD has 16 or more chars', () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      expect(isAdminPasswordConfigured()).toBe(true)
    })

    it('should return true when ADMIN_SECRET has 16 or more chars and ADMIN_PASSWORD is unset', () => {
      process.env.ADMIN_SECRET = MIN_PASSWORD
      expect(isAdminPasswordConfigured()).toBe(true)
    })
  })

  describe('setAdminSessionCookie', () => {
    it('should return null when admin password is not configured', () => {
      expect(setAdminSessionCookie()).toBe(null)
    })

    it('should return cookie name, value, and options when configured', () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      const result = setAdminSessionCookie()
      expect(result).not.toBe(null)
      expect(result!.name).toBe('sb-admin-session')
      expect(typeof result!.value).toBe('string')
      expect(result!.value).toContain('.')
      expect(result!.options).toEqual(
        expect.objectContaining({
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          httpOnly: true,
          sameSite: 'lax',
        })
      )
    })
  })

  describe('checkPassword', () => {
    it('should return false when admin password is not configured', () => {
      expect(checkPassword('any')).toBe(false)
    })

    it('should return false when password does not match', () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      expect(checkPassword('wrong-password')).toBe(false)
    })

    it('should return true when password matches ADMIN_PASSWORD', () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      expect(checkPassword(MIN_PASSWORD)).toBe(true)
    })

    it('should return true when password matches ADMIN_SECRET', () => {
      process.env.ADMIN_SECRET = 'secret-with-16-chars!!'
      expect(checkPassword('secret-with-16-chars!!')).toBe(true)
    })
  })

  describe('getAdminSession', () => {
    it('should return null when admin password is not configured', async () => {
      expect(await getAdminSession()).toBe(null)
    })

    it('should return null when no cookie is present', async () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      mockCookiesGet.mockReturnValue(undefined)
      expect(await getAdminSession()).toBe(null)
    })

    it('should return { ok: true } when valid session cookie is present', async () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      const cookie = setAdminSessionCookie()
      expect(cookie).not.toBe(null)
      mockCookiesGet.mockImplementation((name: string) =>
        name === 'sb-admin-session' ? { value: cookie!.value } : undefined
      )
      const session = await getAdminSession()
      expect(session).toEqual({ ok: true })
    })

    it('should return null when cookie value fails verification', async () => {
      process.env.ADMIN_PASSWORD = MIN_PASSWORD
      mockCookiesGet.mockReturnValue({ value: 'invalid.expired.or.bad' })
      expect(await getAdminSession()).toBe(null)
    })
  })
})
