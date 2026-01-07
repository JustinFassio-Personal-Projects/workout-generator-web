import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Logging Strategy:
 * - All console.log statements are gated behind isDev for production cleanliness
 * - console.error statements log in production but sanitized (no IP addresses, no stack traces)
 * - console.warn statements are gated behind isDev (validation/rate limit warnings)
 * - Production error logging includes error type, code, and message but excludes PII and stack traces
 */

// Simple in-memory rate limiting store
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit: 3 submissions per hour per IP/lead_id
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_STORE_MAX_SIZE = 1000

function getRateLimitKey(request: NextRequest, leadId: string): string {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  return `vision_intel:${leadId}:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
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

// Helper function to get request metadata for logging
// Only includes IP address in development mode for privacy compliance
function getRequestMetadata(request: NextRequest, leadId?: string, isDev: boolean = false) {
  const baseMetadata = {
    leadId: leadId || 'unknown',
    timestamp: new Date().toISOString(),
  }

  // Only include IP in development to avoid logging PII in production
  if (isDev) {
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    return {
      ...baseMetadata,
      ip,
    }
  }

  return baseMetadata
}

// Production-safe error logging - logs errors without PII or stack traces
function logProductionError(message: string, error: unknown, metadata?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorName = error instanceof Error ? error.constructor.name : 'Unknown'

  // Log sanitized error information (no IP, no stack traces, no PII)
  console.error(message, {
    ...(metadata || {}),
    error: errorMessage,
    errorType: errorName,
    // Explicitly exclude: ip, stack, leadId (can be sensitive)
  })
}

// Enhanced error logging for Supabase errors with more context
function logSupabaseError(
  message: string,
  error: { message: string; code?: string; details?: string; hint?: string },
  metadata?: Record<string, unknown>
) {
  console.error(message, {
    ...(metadata || {}),
    error: error.message,
    code: error.code,
    hint: error.hint,
    // Include details if it's not too long (might contain useful debugging info)
    details: error.details && error.details.length < 200 ? error.details : undefined,
  })
}

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  const requestMetadata = getRequestMetadata(request, undefined, isDev)

  try {
    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      // Log parse errors in production (sanitized) for debugging
      logProductionError('Error parsing request body:', parseError, {
        timestamp: requestMetadata.timestamp,
      })
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      lead_id,
      goal_primary,
      frustration_primary,
      ai_expectation_primary,
      payment_trigger_primary,
      expectation_free_text,
      exercise_suggestion,
      vision_prompt,
      image_url,
    } = body

    // Update request metadata with lead_id
    const metadata = getRequestMetadata(request, lead_id, isDev)

    // Validate required fields
    if (!lead_id || typeof lead_id !== 'string' || lead_id.trim().length === 0) {
      if (isDev) {
        console.warn('Validation failed: Missing lead_id', metadata)
      }
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    if (!goal_primary || typeof goal_primary !== 'string' || goal_primary.trim().length === 0) {
      if (isDev) {
        console.warn('Validation failed: Missing goal_primary', metadata)
      }
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 })
    }

    if (
      !frustration_primary ||
      typeof frustration_primary !== 'string' ||
      frustration_primary.trim().length === 0
    ) {
      if (isDev) {
        console.warn('Validation failed: Missing frustration_primary', metadata)
      }
      return NextResponse.json({ error: 'Frustration is required' }, { status: 400 })
    }

    if (
      !ai_expectation_primary ||
      typeof ai_expectation_primary !== 'string' ||
      ai_expectation_primary.trim().length === 0
    ) {
      if (isDev) {
        console.warn('Validation failed: Missing ai_expectation_primary', metadata)
      }
      return NextResponse.json({ error: 'AI expectation is required' }, { status: 400 })
    }

    // Validate free-text length if provided
    if (expectation_free_text && expectation_free_text.length > 500) {
      if (isDev) {
        console.warn('Validation failed: expectation_free_text too long', {
          ...metadata,
          length: expectation_free_text.length,
        })
      }
      return NextResponse.json(
        { error: 'Free text must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, lead_id)
    const rateLimit = checkRateLimit(rateLimitKey)

    if (!rateLimit.allowed) {
      const entry = rateLimitStore.get(rateLimitKey)
      const retryAfter = entry
        ? Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000))
        : 3600
      if (isDev) {
        console.warn('Rate limit exceeded', {
          ...metadata,
          retryAfter,
          rateLimitKey,
        })
      }
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        { status: 429 }
      )
    }

    // Create Supabase client with error handling
    let supabase
    try {
      supabase = await createServerSupabaseClient()
    } catch (supabaseError) {
      const errorMessage =
        supabaseError instanceof Error ? supabaseError.message : 'Unknown Supabase error'
      // Log Supabase client errors in production (sanitized) - critical for debugging
      logProductionError('Failed to create Supabase client:', supabaseError, {
        timestamp: metadata.timestamp,
        errorType: supabaseError instanceof Error ? supabaseError.constructor.name : 'Unknown',
      })
      return NextResponse.json(
        {
          error: 'Server configuration error',
          ...(isDev && { details: 'Supabase client initialization failed', error: errorMessage }),
        },
        { status: 500 }
      )
    }

    // Verify lead exists
    if (isDev) {
      console.log('Verifying lead exists', { ...metadata })
    }
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      // Log lead verification failures in production for debugging
      logSupabaseError(
        'Lead verification failed:',
        {
          message: leadError ? leadError.message : 'Lead not found',
          code: leadError?.code,
          hint: leadError?.hint,
        },
        {
          timestamp: metadata.timestamp,
          leadIdLength: lead_id ? lead_id.length : 0,
          leadIdFormat: lead_id
            ? lead_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
              ? 'valid-uuid'
              : 'invalid-uuid'
            : 'missing',
        }
      )
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    // Validate image_url if provided (should be a valid URL or data URL)
    if (image_url && typeof image_url === 'string' && image_url.trim().length > 0) {
      const trimmedUrl = image_url.trim()

      // Check length - data URLs can be very long, but we should have a reasonable limit
      // PostgreSQL TEXT can handle up to ~1GB, but we'll limit to 10MB for practical purposes
      const MAX_IMAGE_URL_LENGTH = 10 * 1024 * 1024 // 10MB
      if (trimmedUrl.length > MAX_IMAGE_URL_LENGTH) {
        if (isDev) {
          console.warn('Image URL too long', {
            ...metadata,
            length: trimmedUrl.length,
            maxLength: MAX_IMAGE_URL_LENGTH,
          })
        }
        return NextResponse.json(
          { error: 'Image URL is too long. Please use a smaller image.' },
          { status: 400 }
        )
      }

      // Accept data URLs (base64 encoded images)
      if (trimmedUrl.startsWith('data:')) {
        // Validate data URL format: data:image/[type];base64,[data]
        if (trimmedUrl.startsWith('data:image/')) {
          const dataUrlPattern = /^data:image\/[a-zA-Z0-9+.-]+;base64,/i
          if (!dataUrlPattern.test(trimmedUrl)) {
            return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 })
          }
        } else {
          // data: but not data:image/ - invalid
          return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 })
        }
      } else {
        // Validate regular URLs
        try {
          new URL(trimmedUrl)
        } catch {
          return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 })
        }
      }
    }

    // Insert vision lead intel
    if (isDev) {
      console.log('Inserting vision lead intel', {
        ...metadata,
        hasImageUrl: Boolean(image_url),
        hasVisionPrompt: Boolean(vision_prompt),
      })
    }

    const { data: intel, error: insertError } = await supabase
      .from('vision_lead_intel')
      .insert({
        lead_id: lead_id.trim(),
        vision_prompt: vision_prompt ? vision_prompt.trim() : null,
        image_url: image_url ? image_url.trim() : null,
        goal_primary: goal_primary.trim(),
        frustration_primary: frustration_primary.trim(),
        ai_expectation_primary: ai_expectation_primary.trim(),
        payment_trigger_primary: payment_trigger_primary ? payment_trigger_primary.trim() : null,
        expectation_free_text: expectation_free_text ? expectation_free_text.trim() : null,
        exercise_suggestion: exercise_suggestion ? exercise_suggestion.trim() : null,
      })
      .select('id')
      .single()

    if (insertError) {
      // Log database errors in production (sanitized) - critical for debugging
      logSupabaseError('Error inserting vision lead intel:', insertError, {
        timestamp: metadata.timestamp,
        // Log field presence to help debug data issues
        hasGoal: Boolean(goal_primary),
        hasFrustration: Boolean(frustration_primary),
        hasAiExpectation: Boolean(ai_expectation_primary),
        hasImageUrl: Boolean(image_url),
        hasVisionPrompt: Boolean(vision_prompt),
        imageUrlLength: image_url ? image_url.length : 0,
        goalLength: goal_primary ? goal_primary.length : 0,
        frustrationLength: frustration_primary ? frustration_primary.length : 0,
        aiExpectationLength: ai_expectation_primary ? ai_expectation_primary.length : 0,
      })
      return NextResponse.json(
        {
          error: 'Failed to save responses',
          ...(isDev && {
            details: insertError.message,
            code: insertError.code,
            hint: insertError.hint,
          }),
        },
        { status: 500 }
      )
    }

    // Safety check: ensure intel was created
    if (!intel || !intel.id) {
      logProductionError(
        'Insert succeeded but no data returned:',
        new Error('No intel data returned'),
        {
          timestamp: metadata.timestamp,
        }
      )
      return NextResponse.json(
        {
          error: 'Failed to save responses',
          ...(isDev && { details: 'Insert succeeded but no data returned' }),
        },
        { status: 500 }
      )
    }

    if (isDev) {
      console.log('Successfully inserted vision lead intel', {
        ...metadata,
        intelId: intel.id,
      })
    }

    return NextResponse.json(
      {
        success: true,
        intel_id: intel.id,
      },
      { status: 201 }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorName = error instanceof Error ? error.constructor.name : 'Unknown'

    // Log unexpected errors in production (sanitized) - critical for debugging
    // Note: Stack traces only logged in dev, production logs error type and message only
    if (isDev) {
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error('Unexpected error creating vision lead intel:', {
        ...requestMetadata,
        error: errorMessage,
        errorName,
        stack: errorStack,
      })
    } else {
      logProductionError('Unexpected error creating vision lead intel:', error, {
        timestamp: requestMetadata.timestamp,
        errorName,
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to save responses',
        ...(isDev && {
          details: errorMessage,
          errorName,
        }),
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
