import { NextResponse } from 'next/server'
import { notifyMainSiteRevalidate } from '@/lib/notify-main-site'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET: Get single post
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Verify admin access
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { data: post, error } = await adminClient
      .from('posts')
      .select(
        `
        *,
        category:categories(*),
        author:authors(*)
      `
      )
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching post:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      {
        error: 'Failed to fetch post',
        ...(isDev && { details: errorMessage }),
      },
      { status: 500 }
    )
  }
}

// PUT: Update post
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Verify admin access
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const rawData = await request.json()

    // Validate required fields with type and emptiness checks
    if (
      typeof rawData.title !== 'string' ||
      rawData.title.trim().length === 0 ||
      typeof rawData.slug !== 'string' ||
      rawData.slug.trim().length === 0 ||
      typeof rawData.excerpt !== 'string' ||
      rawData.excerpt.trim().length === 0 ||
      typeof rawData.content !== 'string' ||
      rawData.content.trim().length === 0
    ) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
    }

    // Validate status field
    if (rawData.status && rawData.status !== 'draft' && rawData.status !== 'published') {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get current post to check status change
    const { data: currentPost, error: fetchError } = await adminClient
      .from('posts')
      .select('status, slug')
      .eq('slug', slug)
      .single()

    if (fetchError) {
      console.error('Error fetching current post:', fetchError)
      const errorMessage = fetchError.message || 'Unknown database error'
      const isDev = process.env.NODE_ENV !== 'production'
      return NextResponse.json(
        {
          error: 'Failed to fetch post for update',
          ...(isDev && { details: errorMessage, code: fetchError.code }),
        },
        { status: 500 }
      )
    }

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Filter and prepare update data - only include fields that can be updated
    const updateData: Record<string, unknown> = {
      title: rawData.title,
      slug: rawData.slug,
      excerpt: rawData.excerpt,
      content: rawData.content,
      category_id: rawData.category_id || null,
      author_id: rawData.author_id || null,
      tags: rawData.tags || [],
      featured_image: rawData.featured_image || null,
      status: rawData.status,
      seo_title: rawData.seo_title || null,
      seo_description: rawData.seo_description || null,
    }

    // Set published_at if publishing for first time
    if (updateData.status === 'published' && currentPost.status === 'draft') {
      updateData.published_at = new Date().toISOString()
    }

    const { data: post, error } = await adminClient
      .from('posts')
      .update(updateData)
      .eq('slug', slug)
      .select(
        `
        *,
        category:categories(*),
        author:authors(*)
      `
      )
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 400 })
      }
      const errorMessage = error.message || 'Unknown database error'
      const isDev = process.env.NODE_ENV !== 'production'
      return NextResponse.json(
        {
          error: 'Failed to update post',
          ...(isDev && { details: errorMessage, code: error.code }),
        },
        { status: 500 }
      )
    }

    notifyMainSiteRevalidate()

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error updating post:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      {
        error: 'Failed to update post',
        ...(isDev && { details: errorMessage }),
      },
      { status: 500 }
    )
  }
}

// DELETE: Delete post
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Verify admin access
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

    // Only full admins can delete
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete posts' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient.from('posts').delete().eq('slug', slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    notifyMainSiteRevalidate()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
