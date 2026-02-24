import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: Get single lead with relations
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const adminClient = createAdminClient()

    // Fetch lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch related vision_lead_intel
    const { data: visionLeadIntel } = await adminClient
      .from('vision_lead_intel')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })

    // Fetch related exercise_submissions
    const { data: exerciseSubmissions } = await adminClient
      .from('exercise_submissions')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      lead: {
        ...lead,
        vision_lead_intel: visionLeadIntel || [],
        exercise_submissions: exerciseSubmissions || [],
      },
    })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
  }
}

// PUT: Update lead (primarily for verification status)
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Validate request body - only allow updating verified field
    if (typeof body.verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: verified field must be a boolean' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Only update the verified field for security
    const { data: lead, error } = await adminClient
      .from('leads')
      .update({ verified: body.verified })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

// DELETE: Delete lead
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const adminClient = createAdminClient()

    const { error } = await adminClient.from('leads').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
