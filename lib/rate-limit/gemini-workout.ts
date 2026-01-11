import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'gemini_workout_used'
const COOKIE_EXPIRY_HOURS = 24
const COOKIE_EXPIRY_MS = COOKIE_EXPIRY_HOURS * 60 * 60 * 1000

/**
 * Check if the visitor has already used their one-time Gemini workout generation
 * @param request - The incoming NextRequest
 * @returns true if rate limit is exceeded, false if generation is allowed
 */
export function checkGeminiRateLimit(request: NextRequest): boolean {
  const cookie = request.cookies.get(COOKIE_NAME)
  return cookie?.value === 'true'
}

/**
 * Set the rate limit cookie after successful generation
 * @param response - The NextResponse to set the cookie on
 * @returns The response with the cookie set
 */
export function setGeminiRateLimit(response: NextResponse): NextResponse {
  const expiryDate = new Date(Date.now() + COOKIE_EXPIRY_MS)

  response.cookies.set(COOKIE_NAME, 'true', {
    httpOnly: true, // Prevents client-side JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    expires: expiryDate,
    path: '/', // Available site-wide
  })

  return response
}
