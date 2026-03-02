import { NextRequest, NextResponse } from 'next/server'
import { checkGeminiRateLimit, setGeminiRateLimit } from '@/lib/rate-limit/gemini-workout'
import { getPostHogClient } from '@/lib/posthog-server'

export const dynamic = 'force-dynamic'

interface GeminiRequest {
  goal: string
  level: string
  equipment: string
  turnstile_token: string
}

/**
 * Verify Turnstile token with Cloudflare
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_REPORTS_SECRET_KEY

  if (!secretKey) {
    console.error('TURNSTILE_REPORTS_SECRET_KEY not configured')
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
    const body: GeminiRequest = await request.json()
    const { goal, level, equipment, turnstile_token } = body

    // Validate required fields
    if (!goal || !level || !equipment) {
      return NextResponse.json(
        { error: 'Missing required fields: goal, level, equipment' },
        { status: 400 }
      )
    }

    // Verify Turnstile token (bot protection)
    if (!turnstile_token || typeof turnstile_token !== 'string') {
      return NextResponse.json({ error: 'Captcha verification is required' }, { status: 400 })
    }

    const isTurnstileValid = await verifyTurnstileToken(turnstile_token)
    if (!isTurnstileValid) {
      return NextResponse.json({ error: 'Captcha verification failed' }, { status: 400 })
    }

    // Check rate limit (1 generation per visitor per 24 hours)
    if (checkGeminiRateLimit(request)) {
      return NextResponse.json(
        { error: 'You have already generated a workout. Please try again tomorrow.' },
        { status: 429 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const systemPrompt =
      "You are the AI engine behind 'AI Workout Generator'. Your goal is to demonstrate 'System-Based Training' vs 'Random Workouts'. When asked to generate a workout, provide a structured session (Warmup, Main Lift, Accessory). For the Main Lift, specify Tempo (e.g., 3-1-1-0), RPE (Rate of Perceived Exertion), and Rest intervals. Add a brief 'System Logic' explanation at the end of the workout explaining why this specific volume/intensity was chosen for the user's level, contrasting it with generic random advice."

    const userPrompt = `Generate a specific, single workout session for a ${level} athlete with access to ${equipment} focused on ${goal}. Format the output as a structured workout plan. Crucially, include specific 'Tempo' (e.g., 3-0-1-0) and 'RPE' (Rate of Perceived Exertion) for the main lifts to demonstrate a 'System-Based' approach. End with a short 'Coach's Logic' explaining why this structure beats a random workout.`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to generate workout' },
        { status: geminiResponse.status }
      )
    }

    const data = await geminiResponse.json()

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return NextResponse.json({ error: 'Invalid response from Gemini API' }, { status: 500 })
    }

    const rawText = data.candidates[0].content.parts[0].text

    // Infer workout_type from goal
    const goalLower = goal.toLowerCase()
    let workout_type = 'strength' // default
    if (goalLower.includes('cardio') || goalLower.includes('endurance')) {
      workout_type = 'cardio'
    } else if (goalLower.includes('conditioning') || goalLower.includes('circuit')) {
      workout_type = 'conditioning'
    } else if (goalLower.includes('strength') || goalLower.includes('power')) {
      workout_type = 'strength'
    }

    // Map level to difficulty (standardize values)
    const difficultyMap: Record<string, string> = {
      beginner: 'beginner',
      intermediate: 'intermediate',
      advanced: 'advanced',
      novice: 'beginner',
      expert: 'advanced',
    }
    const difficulty = difficultyMap[level.toLowerCase()] || level.toLowerCase()

    // Estimate duration based on workout type (default 30 minutes)
    const duration_minutes =
      workout_type === 'cardio' ? 30 : workout_type === 'conditioning' ? 45 : 30

    // PostHog: Track successful AI workout generation - key conversion event
    try {
      const posthog = getPostHogClient()
      // Use IP as distinct ID since we don't have user auth
      const ip =
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
      posthog.capture({
        distinctId: ip,
        event: 'workout_generated',
        properties: {
          workout_type: workout_type,
          difficulty: difficulty,
          duration_minutes: duration_minutes,
          goal: goal,
          level: level,
          equipment: equipment,
          response_length: rawText.length,
          source: 'gemini_api',
        },
      })
      await posthog.flush()
    } catch (posthogError) {
      // Don't fail the request if PostHog tracking fails
      console.warn('PostHog tracking error:', posthogError)
    }

    // Set rate limit cookie after successful generation
    const nextResponse = NextResponse.json({ workout: rawText })
    setGeminiRateLimit(nextResponse)

    return nextResponse
  } catch (error) {
    console.error('Error generating workout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
