/**
 * Admin blog API: GET one, PUT update, DELETE.
 * Mirrors admin-dash API shape for parity.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { notifyMainSiteRevalidate } from '@/lib/notify-main-site';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ params, request, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const slug = params.slug;
    if (!slug) {
      return json({ error: 'Slug is required' }, 400);
    }

    const supabase = getSupabaseServer();

    const { data: post, error } = await supabase
      .from('posts')
      .select(
        `
        *,
        category:categories(*),
        author:authors(*)
      `
      )
      .eq('slug', slug)
      .single();

    if (error || !post) {
      return json({ error: 'Post not found' }, 404);
    }

    // Include categories and authors for edit form dropdowns
    const { data: categories } = await supabase.from('categories').select('*').order('name');
    const { data: authors } = await supabase.from('authors').select('*').order('name');

    return json({ post, categories: categories || [], authors: authors || [] });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/blog/[slug]] GET error:', error);
    return json({ error: 'Failed to fetch post' }, 500);
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const slug = params.slug;
    if (!slug) {
      return json({ error: 'Slug is required' }, 400);
    }

    let rawData: Record<string, unknown>;
    try {
      rawData = await request.json();
    } catch {
      return json({ error: 'Invalid request body. Expected JSON.' }, 400);
    }

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
      return json({ error: 'Missing or invalid required fields' }, 400);
    }

    if (rawData.status !== undefined && rawData.status !== 'draft' && rawData.status !== 'published') {
      return json({ error: 'Invalid status value' }, 400);
    }

    const supabase = getSupabaseServer();

    const { data: currentPost, error: fetchError } = await supabase
      .from('posts')
      .select('status, slug')
      .eq('slug', slug)
      .single();

    if (fetchError || !currentPost) {
      return json({ error: 'Post not found' }, 404);
    }

    const status: 'draft' | 'published' =
      rawData.status === 'draft' || rawData.status === 'published'
        ? rawData.status
        : (currentPost.status === 'published' ? 'published' : 'draft');

    const updateData: Record<string, unknown> = {
      title: rawData.title,
      slug: rawData.slug,
      excerpt: rawData.excerpt,
      content: rawData.content,
      category_id: rawData.category_id || null,
      author_id: rawData.author_id || null,
      tags: rawData.tags || [],
      featured_image: rawData.featured_image || null,
      status,
      seo_title: rawData.seo_title || null,
      seo_description: rawData.seo_description || null,
    };

    if (updateData.status === 'published' && currentPost.status === 'draft') {
      updateData.published_at = new Date().toISOString();
    }

    const { data: post, error } = await supabase
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
      .single();

    if (error) {
      if (error.code === '23505') {
        return json({ error: 'A post with this slug already exists' }, 400);
      }
      return json({ error: error.message }, 500);
    }

    notifyMainSiteRevalidate();

    return json({ post });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/blog/[slug]] PUT error:', error);
    return json({ error: 'Failed to update post' }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const slug = params.slug;
    if (!slug) {
      return json({ error: 'Slug is required' }, 400);
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.from('posts').delete().eq('slug', slug);

    if (error) {
      return json({ error: error.message }, 500);
    }

    notifyMainSiteRevalidate();

    return json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/blog/[slug]] DELETE error:', error);
    return json({ error: 'Failed to delete post' }, 500);
  }
};
