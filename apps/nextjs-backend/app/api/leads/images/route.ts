import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Lead Image Upload API Route
 *
 * Security:
 * - Validates lead_id exists in leads table
 * - Rate limiting per IP and per lead_id
 * - Magic bytes validation (detects actual file type)
 * - Content-Type validation
 * - File size validation (5MB max)
 * - Uses service role key for uploads (server-side only)
 *
 * Logging Strategy:
 * - All console.log statements are gated behind isDev for production cleanliness
 * - console.error statements log in production but sanitized (no IP addresses, no stack traces, no leadId)
 * - console.warn statements are gated behind isDev (validation/rate limit warnings)
 * - Production error logging includes error type and message but excludes PII (IP, leadId, stack traces)
 */

// Magic bytes for image validation
const MAGIC_BYTES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header (first 4 bytes)
  'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const RATE_LIMIT_MAX = 5 // 5 uploads per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

// Simple in-memory rate limiting store
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Validate magic bytes match Content-Type
function validateMagicBytes(buffer: Buffer, contentType: string): boolean {
  const expected = MAGIC_BYTES[contentType as keyof typeof MAGIC_BYTES]
  if (!expected) return false

  // For WebP, check RIFF header (bytes 0-3) and WEBP signature (bytes 8-11)
  if (contentType === 'image/webp') {
    if (buffer.length < 12) return false
    const riffHeader = buffer.slice(0, 4).toString('ascii')
    const webpSignature = buffer.slice(8, 12).toString('ascii')
    return riffHeader === 'RIFF' && webpSignature === 'WEBP'
  }

  // For other formats, check first bytes
  return expected.every((byte, i) => buffer[i] === byte)
}

function getRateLimitKey(leadId: string, ip: string): string {
  return `upload:${leadId}:${ip}`
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
    if (rateLimitStore.size > 1000) {
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

// Production-safe error logging - logs errors without PII or stack traces
function logProductionError(message: string, error: unknown, metadata?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorName = error instanceof Error ? error.constructor.name : 'Unknown'

  // Sanitize metadata - exclude PII (leadId, IP addresses)
  const sanitizedMetadata: Record<string, unknown> = {}
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      // Exclude leadId and IP from production logs
      if (key !== 'leadId' && key !== 'ip') {
        sanitizedMetadata[key] = value
      }
    }
  }

  console.error(message, {
    ...sanitizedMetadata,
    error: errorMessage,
    errorType: errorName,
    // Explicitly exclude: leadId, ip (can be sensitive)
  })
}

export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  try {
    // Get lead_id from query params
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('lead_id')

    if (!leadId || typeof leadId !== 'string' || leadId.trim().length === 0) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
    }

    const trimmedLeadId = leadId.trim()

    // Validate lead_id format (UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(trimmedLeadId)) {
      return NextResponse.json({ error: 'Invalid lead_id format' }, { status: 400 })
    }

    // Verify lead exists
    const supabase = await createServerSupabaseClient()
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', trimmedLeadId)
      .single()

    if (leadError || !lead) {
      if (isDev) {
        console.warn('Lead validation failed:', {
          leadId: trimmedLeadId,
          error: leadError?.message,
        })
      }
      return NextResponse.json({ error: 'Invalid lead_id' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitKey = getRateLimitKey(trimmedLeadId, ip)
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
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      logProductionError('Error parsing form data:', parseError, {
        // leadId excluded from production logs (PII)
        ...(isDev && { leadId: trimmedLeadId }),
      })
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, png, webp, gif' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size: 5MB' }, { status: 400 })
    }

    // Get file buffer for magic bytes validation
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate magic bytes
    if (!validateMagicBytes(buffer, file.type)) {
      logProductionError('Magic bytes validation failed:', new Error('File type mismatch'), {
        // leadId excluded from production logs (PII)
        ...(isDev && { leadId: trimmedLeadId }),
        contentType: file.type,
        fileSize: file.size,
      })
      return NextResponse.json(
        { error: 'Invalid file type. File content does not match declared type.' },
        { status: 400 }
      )
    }

    // Generate unique filename
    // Note: Using timestamp + UUID makes duplicate filenames virtually impossible
    // (probability < 10^-38). However, we still handle the edge case explicitly.
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const randomId = crypto.randomUUID()
    const filename = `${timestamp}-${randomId}.${ext}`
    const path = `${trimmedLeadId}/${filename}`

    // Upload to Supabase Storage using admin client (service role)
    const adminClient = createAdminClient()
    const { error: uploadError } = await adminClient.storage
      .from('lead-images')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year cache
        upsert: false, // Don't overwrite existing files - handle conflicts explicitly
      })

    if (uploadError) {
      logProductionError('Storage upload error:', uploadError, {
        // leadId excluded from production logs (PII)
        ...(isDev && { leadId: trimmedLeadId }),
        path,
        fileSize: file.size,
        contentType: file.type,
      })

      // Handle specific error cases
      // Duplicate file error (extremely unlikely due to timestamp + UUID)
      if (
        uploadError.message?.includes('duplicate') ||
        uploadError.message?.includes('already exists') ||
        uploadError.message?.includes('conflict')
      ) {
        return NextResponse.json(
          {
            error: 'File with this name already exists. Please try again.',
            ...(isDev && { details: 'This is an extremely rare edge case' }),
          },
          { status: 409 }
        )
      }

      // Storage quota errors
      if (uploadError.message?.includes('quota') || uploadError.message?.includes('limit')) {
        return NextResponse.json(
          { error: 'Storage quota exceeded. Please contact support.' },
          { status: 507 }
        )
      }

      // Generic upload failure
      return NextResponse.json(
        {
          error: 'Upload failed',
          ...(isDev && { details: uploadError.message }),
        },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = adminClient.storage.from('lead-images').getPublicUrl(path)

    if (isDev) {
      console.log('Image uploaded successfully', {
        leadId: trimmedLeadId,
        path,
        fileSize: file.size,
        contentType: file.type,
      })
    }

    return NextResponse.json({
      url: publicUrl,
      path,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logProductionError('Unexpected error in image upload:', error, {})

    return NextResponse.json(
      {
        error: 'Upload failed',
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
