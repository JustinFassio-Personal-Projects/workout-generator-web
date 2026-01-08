import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/validation'

// Simple in-memory rate limiting store
// In production, consider using Redis or Vercel Edge Config
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * Safely log errors without exposing sensitive data
 */
function logError(context: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorName = error instanceof Error ? error.name : 'Error'

  console.error(`[${context}]`, {
    name: errorName,
    message: errorMessage,
    // Intentionally exclude stack trace and full error object
  })
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit: 5 submissions per hour per IP/user (production)
// In development, use a much higher limit and shorter window to allow for testing
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 5 : 50
const RATE_LIMIT_WINDOW = process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 5 * 60 * 1000 // 1 hour (prod) or 5 minutes (dev)
const RATE_LIMIT_STORE_MAX_SIZE = 1000 // Maximum entries before cleanup

// Maximum length for error text in logs (truncate longer errors to prevent log bloat)
const MAX_ERROR_LOG_LENGTH = 200

function getRateLimitKey(request: NextRequest, userId: string | null): string {
  // Use user ID if authenticated, otherwise use IP
  if (userId) {
    return `user:${userId}`
  }
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const xRealIp = request.headers.get('x-real-ip')
  const ip = xForwardedFor || xRealIp || 'unknown'
  // In development, all requests from localhost share the same IP, which can cause rate limit issues
  // Consider using a more unique identifier in development (e.g., session-based)
  return `ip:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // In development, clean up expired entries more aggressively
  if (process.env.NODE_ENV !== 'production' && rateLimitStore.size > 0) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k)
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    // Clean up old entries periodically
    if (rateLimitStore.size > RATE_LIMIT_STORE_MAX_SIZE) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now > v.resetTime) {
          rateLimitStore.delete(k)
        }
      }
    }
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (if any)
    let user = null
    try {
      user = await getServerUser()
    } catch (error) {
      // User not authenticated is fine for anonymous submissions
      console.log('Support ticket submitted without authentication (anonymous submission)')
    }

    // Parse request body
    const body = await request.json()

    // Log request for debugging (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Support API] Request body:', {
        hasSubject: !!body.subject,
        hasDescription: !!body.description,
        category: body.category,
        priority: body.priority,
        hasEmail: !!body.email,
        emailValue: body.email ? `${body.email.substring(0, 3)}...` : 'missing',
        isAuthenticated: !!user,
        userId: user?.id || 'anonymous',
      })
    }

    // Validate required fields
    const { subject, description, category, priority, email } = body

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    // Validate subject minimum length (Firebase requires at least 5 characters)
    const trimmedSubject = subject.trim()
    if (trimmedSubject.length < 5) {
      return NextResponse.json(
        { error: 'Subject must be at least 5 characters long' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Validate category matches admin's expected values
    const validCategories = ['billing', 'technical', 'feature_request', 'bug', 'other']
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Category must be one of: billing, technical, feature_request, bug, other' },
        { status: 400 }
      )
    }

    // Validate priority matches admin's expected values
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (!priority || !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be one of: low, medium, high, urgent' },
        { status: 400 }
      )
    }

    // Email validation - use email from body or fallback to user email
    const userEmail = email || user?.email
    if (!userEmail || !validateEmail(userEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, user?.id || null)
    const rateLimit = checkRateLimit(rateLimitKey)

    if (!rateLimit.allowed) {
      const entry = rateLimitStore.get(rateLimitKey)
      const retryAfter = entry
        ? Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000))
        : 3600

      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        { status: 429 }
      )
    }

    // Get Firebase Cloud Function URL from environment
    const firebaseFunctionUrl = process.env.FIREBASE_CLOUD_FUNCTION_URL

    if (!firebaseFunctionUrl) {
      console.error('Firebase Cloud Function URL not configured')
      return NextResponse.json({ error: 'Cloud Function URL not configured' }, { status: 500 })
    }

    // Prepare payload - pass through body with honeypot field ensured
    // Ensure email and user_id are set correctly
    // NOTE: Only include user_id if Firebase knows about this user.
    // Since Firebase is a separate system, we don't send user_id to avoid
    // "User not found" errors. Firebase can identify users by email if needed.
    const payload = {
      ...body,
      email: userEmail, // Use validated email
      website: '', // Honeypot field - must be empty
      // Removed user_id - Firebase doesn't have Supabase users, causing "User not found" errors
      // Firebase can use email to identify users if needed
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add function key if configured
    const functionKey = process.env.FIREBASE_FUNCTION_KEY
    if (functionKey) {
      headers['x-function-key'] = functionKey
    }

    // Call Firebase Cloud Function
    const response = await fetch(firebaseFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    // Parse JSON response with error handling
    let data: any
    try {
      data = await response.json()
    } catch (parseError) {
      logError('Parsing Firebase Cloud Function response JSON', parseError)
      data = {}
    }

    if (!response.ok) {
      console.error('Firebase Cloud Function error:', {
        status: response.status,
        error: data.error || 'Unknown error',
      })
      return NextResponse.json(
        { error: data.error || 'Failed to create support ticket' },
        { status: response.status }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    logError('Support ticket creation', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json(
      {
        error: 'Failed to create support ticket',
        ...(isDev && { details: errorMessage }),
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
