import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
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

    const data = await request.json()
    const adminClient = createAdminClient()

    // Get current post to check status change
    const { data: currentPost } = await adminClient
      .from('posts')
      .select('status, slug')
      .eq('slug', slug)
      .single()

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Set published_at if publishing for first time
    if (data.status === 'published' && currentPost.status === 'draft') {
      data.published_at = new Date().toISOString()
    }

    const { data: post, error } = await adminClient
      .from('posts')
      .update(data)
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
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate pages
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)

    // If slug changed, revalidate old slug too
    if (data.slug && data.slug !== slug) {
      revalidatePath(`/blog/${data.slug}`)
    }

    revalidatePath('/sitemap.xml')
    revalidatePath('/feed.xml')

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
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

    // Revalidate pages
    revalidatePath('/blog')
    revalidatePath(`/blog/${slug}`)
    revalidatePath('/sitemap.xml')
    revalidatePath('/feed.xml')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
