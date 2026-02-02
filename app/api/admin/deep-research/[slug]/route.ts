import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

const HTML_CONTENT_MAX_SIZE = 500 * 1024 // 500KB

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET: Get single deep research (admin)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

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
      return NextResponse.json({ error: 'Only admins can access deep research' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { data: item, error } = await adminClient
      .from('deep_research')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !item) {
      return NextResponse.json({ error: 'Deep research not found' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error fetching deep research:', error)
    return NextResponse.json({ error: 'Failed to fetch deep research' }, { status: 500 })
  }
}

// PUT: Update deep research
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

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
      return NextResponse.json({ error: 'Only admins can update deep research' }, { status: 403 })
    }

    const rawData = await request.json()

    if (
      typeof rawData.title !== 'string' ||
      rawData.title.trim().length === 0 ||
      typeof rawData.slug !== 'string' ||
      rawData.slug.trim().length === 0 ||
      typeof rawData.excerpt !== 'string' ||
      rawData.excerpt.trim().length === 0 ||
      typeof rawData.html_content !== 'string' ||
      rawData.html_content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: title, slug, excerpt, html_content' },
        { status: 400 }
      )
    }

    if (rawData.html_content.length > HTML_CONTENT_MAX_SIZE) {
      return NextResponse.json(
        { error: 'HTML content exceeds maximum size (500KB)' },
        { status: 400 }
      )
    }

    if (rawData.status && rawData.status !== 'draft' && rawData.status !== 'published') {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: currentItem, error: fetchError } = await adminClient
      .from('deep_research')
      .select('status')
      .eq('slug', slug)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json({ error: 'Deep research not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      title: rawData.title,
      slug: rawData.slug,
      excerpt: rawData.excerpt,
      html_content: rawData.html_content,
      seo_title: rawData.seo_title || null,
      seo_description: rawData.seo_description || null,
      status:
        rawData.status === 'draft' || rawData.status === 'published'
          ? (rawData.status as 'draft' | 'published')
          : currentItem.status,
      equipment_zones: rawData.equipment_zones || [],
      experience_levels: rawData.experience_levels || [],
      injuries_addressed: rawData.injuries_addressed || [],
      goals: rawData.goals || [],
      days_per_week_min: rawData.days_per_week_min ?? null,
      days_per_week_max: rawData.days_per_week_max ?? null,
      diet_types: rawData.diet_types || [],
      nutrition_goals: rawData.nutrition_goals || [],
      dietary_restrictions: rawData.dietary_restrictions || [],
      macro_focus: rawData.macro_focus || [],
    }

    if (updateData.status === 'published' && currentItem.status === 'draft') {
      updateData.published_at = new Date().toISOString()
    }

    const { data: item, error } = await adminClient
      .from('deep_research')
      .update(updateData)
      .eq('slug', slug)
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

    revalidatePath('/deep-research')
    revalidatePath(`/deep-research/${slug}`)
    if (updateData.slug && updateData.slug !== slug) {
      revalidatePath(`/deep-research/${updateData.slug}`)
    }
    revalidatePath('/sitemap.xml')

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating deep research:', error)
    return NextResponse.json({ error: 'Failed to update deep research' }, { status: 500 })
  }
}

// DELETE: Delete deep research
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

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
      return NextResponse.json({ error: 'Only admins can delete deep research' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient.from('deep_research').delete().eq('slug', slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/deep-research')
    revalidatePath(`/deep-research/${slug}`)
    revalidatePath('/sitemap.xml')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deep research:', error)
    return NextResponse.json({ error: 'Failed to delete deep research' }, { status: 500 })
  }
}
