import { checkBotId } from 'botid/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Check if the request is from a bot
  const verification = await checkBotId()

  if (verification.isBot) {
    return NextResponse.json({ error: 'Bot detected. Access denied.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { workflowId, userId } = body

    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 })
    }

    // Get OpenAI API key from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Call OpenAI ChatKit API to create a session
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1', // Required header for ChatKit API
      },
      body: JSON.stringify({
        workflow: { id: workflowId },
        user: userId || 'anonymous',
      }),
    })

    if (!response.ok) {
      let errorData: string
      try {
        errorData = await response.text()
      } catch {
        errorData = 'Unknown error'
      }

      // Log full error details server-side for debugging (not exposed to client)
      console.error('OpenAI ChatKit API error:', response.status, errorData)

      // Handle specific error cases
      if (response.status === 401) {
        // Domain verification or authentication error
        // Don't expose raw errorData to client - may contain sensitive info
        return NextResponse.json(
          {
            error: 'ChatKit authentication failed',
            message:
              'Domain verification may be required. Please verify your production domain in OpenAI ChatKit dashboard.',
            status: response.status,
          },
          { status: 401 }
        )
      }

      // Return sanitized error message (don't expose raw OpenAI error details)
      return NextResponse.json(
        {
          error: 'Failed to create ChatKit session',
          message: `ChatKit service unavailable (${response.status})`,
          status: response.status,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ client_secret: data.client_secret })
  } catch (error) {
    // Log full error details server-side for debugging (not exposed to client)
    console.error('Error creating ChatKit session:', error)
    // Don't expose raw error message to client - may contain sensitive info
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Unable to initialize chat session. Please try again later.',
      },
      { status: 500 }
    )
  }
}
