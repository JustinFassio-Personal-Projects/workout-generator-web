import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { validateDeepResearchPayload } from '@/lib/deep-research/validation'

// GET: List all deep research (including drafts)
export async function GET(request: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can list deep research' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = adminClient
      .from('deep_research')
      .select('*')
      .order('updated_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    const { data: items, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error fetching deep research:', error)
    return NextResponse.json({ error: 'Failed to fetch deep research' }, { status: 500 })
  }
}

// POST: Create new deep research
export async function POST(request: Request) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create deep research' }, { status: 403 })
    }

    const data = await request.json()

    const validation = validateDeepResearchPayload(data)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    if (data.status !== 'draft' && data.status !== 'published') {
      return NextResponse.json(
        { error: 'Missing or invalid required field: status must be "draft" or "published"' },
        { status: 400 }
      )
    }

    if (data.status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString()
    }

    // Include required and optional metadata; status is validated above
    const excerpt =
      typeof data.excerpt === 'string' && data.excerpt.trim().length > 0
        ? data.excerpt.trim()
        : null
    const insertData = {
      ...data,
      excerpt,
      status: data.status as 'draft' | 'published',
      equipment_zones: data.equipment_zones || [],
      experience_levels: data.experience_levels || [],
      injuries_addressed: data.injuries_addressed || [],
      goals: data.goals || [],
      days_per_week_min: data.days_per_week_min ?? null,
      days_per_week_max: data.days_per_week_max ?? null,
      diet_types: data.diet_types || [],
      nutrition_goals: data.nutrition_goals || [],
      dietary_restrictions: data.dietary_restrictions || [],
      macro_focus: data.macro_focus || [],
    }

    const adminClient = createAdminClient()

    const { data: item, error } = await adminClient
      .from('deep_research')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A deep research entry with this slug already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (item.status === 'published') {
      revalidatePath('/deep-research')
      revalidatePath(`/deep-research/${item.slug}`)
      revalidatePath('/sitemap.xml')
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error creating deep research:', error)
    return NextResponse.json({ error: 'Failed to create deep research' }, { status: 500 })
  }
}
