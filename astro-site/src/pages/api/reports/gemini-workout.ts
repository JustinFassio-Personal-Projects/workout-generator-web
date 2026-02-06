import type { APIRoute } from 'astro'

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e)
    return String((e as { message: unknown }).message)
  return 'Unknown error'
}

export const prerender = false

const COOKIE_NAME = 'gemini_workout_used'
const COOKIE_MAX_AGE = 24 * 60 * 60 // 24 hours in seconds

interface GeminiRequest {
  goal: string
  level: string
  equipment: string
  turnstile_token: string
}

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = import.meta.env.TURNSTILE_REPORTS_SECRET_KEY

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
    console.error('Turnstile verification error:', errMsg(error))
    return false
  }
}

function checkGeminiRateLimit(request: Request): boolean {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match?.[1] === 'true'
}

function setGeminiRateLimitCookie(): string {
  const isProduction = import.meta.env.PROD
  const secure = isProduction ? '; Secure' : ''
  return `${COOKIE_NAME}=true; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}${secure}`
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: GeminiRequest = await request.json()
    const { goal, level, equipment, turnstile_token } = body

    if (!goal || !level || !equipment) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: goal, level, equipment' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!turnstile_token || typeof turnstile_token !== 'string') {
      return new Response(JSON.stringify({ error: 'Captcha verification is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isTurnstileValid = await verifyTurnstileToken(turnstile_token)
    if (!isTurnstileValid) {
      return new Response(JSON.stringify({ error: 'Captcha verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (checkGeminiRateLimit(request)) {
      return new Response(
        JSON.stringify({
          error: 'You have already generated a workout. Please try again tomorrow.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = import.meta.env.GEMINI_API_KEY

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
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
      await geminiResponse.text() // consume body
      console.error('Gemini API error: request failed', geminiResponse.status)
      return new Response(JSON.stringify({ error: 'Failed to generate workout' }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await geminiResponse.json()

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return new Response(JSON.stringify({ error: 'Invalid response from Gemini API' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rawText = data.candidates[0].content.parts[0].text

    const response = new Response(JSON.stringify({ workout: rawText }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setGeminiRateLimitCookie(),
      },
    })

    return response
  } catch (error) {
    console.error('Error generating workout:', errMsg(error))
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
