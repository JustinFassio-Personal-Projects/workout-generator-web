import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

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

// Rate limit: 5 submissions per hour per IP/user
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_STORE_MAX_SIZE = 1000 // Maximum entries before cleanup

// Maximum length for error text in logs (truncate longer errors to prevent log bloat)
const MAX_ERROR_LOG_LENGTH = 200

function getRateLimitKey(request: NextRequest, userId: string | null): string {
  // Use user ID if authenticated, otherwise use IP
  if (userId) {
    return `user:${userId}`
  }
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

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

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

    // Validate required fields
    const { subject, description, category, email, source, current_url, utm_params, device_type } =
      body

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    // Email validation
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

    // Prepare ticket payload
    const ticketPayload = {
      user_id: user?.id || null,
      subject: subject.trim(),
      description: description.trim(),
      status: 'open',
      priority: 'normal',
      category: category.trim(),
      source: source || 'website',
      current_url: current_url || '',
      utm_params: utm_params || {},
      device_type: device_type || 'unknown',
      user_email: userEmail,
      messages: [
        {
          role: 'user',
          content: description.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Get Firebase Cloud Function URL from environment
    const firebaseFunctionUrl =
      process.env.FIREBASE_CLOUD_FUNCTION_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_SUPPORT_FUNCTION_URL

    if (!firebaseFunctionUrl) {
      console.error('Firebase Cloud Function URL not configured')
      return NextResponse.json(
        { error: 'Support service is temporarily unavailable' },
        { status: 503 }
      )
    }

    // Prepare headers with optional authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (process.env.FIREBASE_FUNCTION_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.FIREBASE_FUNCTION_SECRET}`
    }

    // Call Firebase Cloud Function
    const response = await fetch(firebaseFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(ticketPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const sanitizedError =
        errorText?.length > MAX_ERROR_LOG_LENGTH
          ? errorText.substring(0, MAX_ERROR_LOG_LENGTH) + '...'
          : errorText
      console.error('Firebase Cloud Function error:', {
        status: response.status,
        error: sanitizedError?.replace(/Bearer\s+[\w-]+/gi, '[REDACTED]'), // Remove any tokens
      })
      return NextResponse.json(
        { error: 'Failed to create support ticket. Please try again later.' },
        { status: 502 }
      )
    }

    const result = await response.json().catch(() => ({ success: true }))

    return NextResponse.json(
      {
        success: true,
        message: 'Support ticket created successfully',
        ticketId: result.id || result.ticketId || null,
      },
      { status: 201 }
    )
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
