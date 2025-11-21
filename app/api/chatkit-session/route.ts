import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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
      const errorData = await response.text()
      console.error('OpenAI ChatKit API error:', response.status, errorData)
      // Return detailed error for debugging
      return NextResponse.json(
        {
          error: 'Failed to create ChatKit session',
          details: errorData,
          status: response.status,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ client_secret: data.client_secret })
  } catch (error) {
    console.error('Error creating ChatKit session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
