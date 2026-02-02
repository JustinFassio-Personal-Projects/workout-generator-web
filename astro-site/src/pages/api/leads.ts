import type { APIRoute } from 'astro'
import { createServerSupabaseClient, validateEmail } from '@/lib/supabase/server'

// Disable prerendering for API routes (they need to run on the server)
export const prerender = false

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

function getRateLimitKey(request: Request, email: string): string {
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
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY

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

export const POST: APIRoute = async ({ request, cookies }) => {
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
      return new Response(JSON.stringify({ error: 'First name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate email format
    if (!validateEmail(email.trim())) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check rate limit
    const rateLimitKey = getRateLimitKey(request, email)
    const { allowed, remaining } = checkRateLimit(rateLimitKey)

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // Verify Turnstile token (skip in development if not configured)
    if (turnstile_token) {
      const isValidToken = await verifyTurnstileToken(turnstile_token)
      if (!isValidToken) {
        return new Response(JSON.stringify({ error: 'Invalid security token' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Create Supabase client
    const supabase = createServerSupabaseClient(cookies)

    // Insert lead into database
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          first_name: first_name.trim(),
          email: email.trim().toLowerCase(),
          consent_follow_up: Boolean(consent_follow_up),
          consent_email_plan: Boolean(consent_email_plan),
          coaching_interest: Boolean(coaching_interest),
          source: source || 'website',
        },
      ])
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({
            error: 'This email is already registered',
            code: 'DUPLICATE_EMAIL',
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      console.error('Supabase error:', error)
      return new Response(JSON.stringify({ error: 'Failed to save lead. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead captured successfully',
        lead_id: data?.id,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    )
  } catch (error) {
    console.error('API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
