/**
 * Admin blog API: GET list, POST create.
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

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const supabase = getSupabaseServer();
    const searchParams = url.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabase
      .from('posts')
      .select(
        `
        *,
        category:categories(*),
        author:authors(*)
      `
      )
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: posts, error } = await query;

    if (error) {
      return json({ error: error.message }, 500);
    }

    const { data: categories } = await supabase.from('categories').select('*').order('name');
    const { data: authors } = await supabase.from('authors').select('*').order('name');

    return json({ posts: posts || [], categories: categories || [], authors: authors || [] });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/blog] GET error:', error);
    return json({ error: 'Failed to fetch posts' }, 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);

    let data: Record<string, unknown>;
    try {
      data = await request.json();
    } catch {
      return json({ error: 'Invalid request body. Expected JSON.' }, 400);
    }

    if (!data.title || !data.slug || !data.excerpt || !data.content) {
      return json({ error: 'Missing required fields: title, slug, excerpt, content' }, 400);
    }

    if (data.status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString();
    }

    const supabase = getSupabaseServer();

    const { data: post, error } = await supabase
      .from('posts')
      .insert(data)
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

    return json({ post }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/blog] POST error:', error);
    return json({ error: 'Failed to create post' }, 500);
  }
};
