import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      lead_id,
      goal_primary,
      frustration_primary,
      ai_expectation_primary,
      payment_trigger_primary,
      expectation_free_text,
      exercise_suggestion,
      vision_prompt,
    } = body

    // Validate required fields
    if (!lead_id || typeof lead_id !== 'string' || lead_id.trim().length === 0) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    if (!goal_primary || typeof goal_primary !== 'string' || goal_primary.trim().length === 0) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 })
    }

    if (
      !frustration_primary ||
      typeof frustration_primary !== 'string' ||
      frustration_primary.trim().length === 0
    ) {
      return NextResponse.json({ error: 'Frustration is required' }, { status: 400 })
    }

    if (
      !ai_expectation_primary ||
      typeof ai_expectation_primary !== 'string' ||
      ai_expectation_primary.trim().length === 0
    ) {
      return NextResponse.json({ error: 'AI expectation is required' }, { status: 400 })
    }

    // Validate free-text length if provided
    if (expectation_free_text && expectation_free_text.length > 500) {
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
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        { status: 429 }
      )
    }

    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // Verify lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    // Insert vision lead intel
    const { data: intel, error: insertError } = await supabase
      .from('vision_lead_intel')
      .insert({
        lead_id: lead_id.trim(),
        vision_prompt: vision_prompt ? vision_prompt.trim() : null,
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
      console.error('Error inserting vision lead intel:', insertError)
      return NextResponse.json({ error: 'Failed to save responses' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        intel_id: intel.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating vision lead intel:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json(
      {
        error: 'Failed to save responses',
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
