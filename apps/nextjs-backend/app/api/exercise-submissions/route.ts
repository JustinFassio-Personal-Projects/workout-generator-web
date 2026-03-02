import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  validateExerciseName,
  validateTechniqueCues,
  validateArrayNotEmpty,
  validateEnum,
} from '@/lib/validation'
import type {
  ExerciseCategory,
  EquipmentType,
  MovementPattern,
  DifficultyLevel,
} from '@/types/exercise-challenge'

// Simple in-memory rate limiting store
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Rate limit: 10 submissions per day per lead
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const RATE_LIMIT_STORE_MAX_SIZE = 1000

function getRateLimitKey(leadId: string): string {
  return `submission:${leadId}`
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

const VALID_CATEGORIES: readonly ExerciseCategory[] = [
  'strength',
  'conditioning',
  'mobility',
  'skill',
  'recovery',
] as const

const VALID_EQUIPMENT: readonly EquipmentType[] = [
  'none',
  'db',
  'bb',
  'kb',
  'bands',
  'machine',
  'other',
] as const

const VALID_MOVEMENT_PATTERNS: readonly MovementPattern[] = [
  'squat',
  'hinge',
  'push',
  'pull',
  'carry',
  'rotation',
  'locomotion',
] as const

const VALID_DIFFICULTIES: readonly DifficultyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      lead_id,
      exercise_name,
      category,
      equipment,
      primary_muscles,
      movement_pattern,
      difficulty,
      technique_cues,
      safety_notes,
      regression,
      progression,
      mistakes,
      contraindications,
      rationale,
      vision_prompt,
    } = body

    // Validate lead_id
    if (!lead_id || typeof lead_id !== 'string') {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    // Validate required fields
    if (!validateExerciseName(exercise_name)) {
      return NextResponse.json(
        { error: 'Exercise name is required and must be 1-100 characters' },
        { status: 400 }
      )
    }

    if (!validateEnum(category, VALID_CATEGORIES)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (!validateEnum(equipment, VALID_EQUIPMENT)) {
      return NextResponse.json({ error: 'Invalid equipment type' }, { status: 400 })
    }

    if (!validateArrayNotEmpty(primary_muscles) || !Array.isArray(primary_muscles)) {
      return NextResponse.json(
        { error: 'At least one primary muscle group is required' },
        { status: 400 }
      )
    }

    if (!validateEnum(movement_pattern, VALID_MOVEMENT_PATTERNS)) {
      return NextResponse.json({ error: 'Invalid movement pattern' }, { status: 400 })
    }

    if (!validateEnum(difficulty, VALID_DIFFICULTIES)) {
      return NextResponse.json({ error: 'Invalid difficulty level' }, { status: 400 })
    }

    if (!validateTechniqueCues(technique_cues)) {
      return NextResponse.json(
        { error: 'Technique cues are required and must be 10-2000 characters' },
        { status: 400 }
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

    // Rate limiting
    const rateLimitKey = getRateLimitKey(lead_id)
    const rateLimit = checkRateLimit(rateLimitKey)

    if (!rateLimit.allowed) {
      const entry = rateLimitStore.get(rateLimitKey)
      const retryAfter = entry
        ? Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000))
        : 86400
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        { status: 429 }
      )
    }

    // Insert exercise submission
    const { data: submission, error: insertError } = await supabase
      .from('exercise_submissions')
      .insert({
        lead_id: lead_id,
        exercise_name: exercise_name.trim(),
        category: category,
        equipment: equipment,
        primary_muscles: primary_muscles,
        movement_pattern: movement_pattern,
        difficulty: difficulty,
        technique_cues: technique_cues.trim(),
        safety_notes: safety_notes?.trim() || null,
        regression: regression?.trim() || null,
        progression: progression?.trim() || null,
        mistakes: mistakes?.trim() || null,
        contraindications: contraindications?.trim() || null,
        rationale: rationale?.trim() || null,
        vision_prompt: vision_prompt?.trim() || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting exercise submission:', insertError)
      return NextResponse.json({ error: 'Failed to create exercise submission' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        submission_id: submission.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating exercise submission:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV !== 'production'

    return NextResponse.json(
      {
        error: 'Failed to create exercise submission',
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
