import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/validation'

// Simple in-memory rate limiting store
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit: 5 submissions per hour per IP/email
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_STORE_MAX_SIZE = 1000

function getRateLimitKey(request: NextRequest, email: string): string {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  return `lead:${email.toLowerCase()}:${ip}`
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

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not configured')
    return false
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      first_name,
      email,
      consent_follow_up,
      consent_email_plan,
      coaching_interest,
      turnstile_token,
      source,
    } = body

    // Validate required fields
    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (!turnstile_token || typeof turnstile_token !== 'string') {
      return NextResponse.json({ error: 'Captcha verification is required' }, { status: 400 })
    }

    // Verify Turnstile token
    const isTurnstileValid = await verifyTurnstileToken(turnstile_token)
    if (!isTurnstileValid) {
      return NextResponse.json({ error: 'Captcha verification failed' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, email)
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

    // Get UTM parameters and referrer from request
    const url = new URL(request.url)
    const utmSource = url.searchParams.get('utm_source') || null
    const utmCampaign = url.searchParams.get('utm_campaign') || null
    const utmMedium = url.searchParams.get('utm_medium') || null
    const referrer = request.headers.get('referer') || null

    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // Check for duplicate email
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingLead) {
      // Return existing lead ID (don't create duplicate)
      return NextResponse.json(
        {
          success: true,
          lead_id: existingLead.id,
          message: 'Lead already exists',
        },
        { status: 200 }
      )
    }

    // Insert lead
    // Use provided source or default to 'vision_lab' for new leads, 'exercise_challenge' for backward compat
    const leadSource = source || 'vision_lab'

    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert({
        first_name: first_name.trim(),
        email: email.toLowerCase().trim(),
        source: leadSource,
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        utm_medium: utmMedium,
        referrer: referrer,
        consent_follow_up: Boolean(consent_follow_up),
        consent_email_plan: Boolean(consent_email_plan),
        coaching_interest: Boolean(coaching_interest),
        verified: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting lead:', insertError)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        lead_id: lead.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating lead:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json(
      {
        error: 'Failed to create lead',
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
