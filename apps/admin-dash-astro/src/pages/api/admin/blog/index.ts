/**
 * Admin blog API: GET list, POST create.
 * Mirrors admin-dash API shape for parity.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { escapePostgrestFilterValue } from '@/lib/escape-postgrest-filter';
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
      const escaped = escapePostgrestFilterValue(search);
      query = query.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
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
      return json({ error: 'Missing or invalid required fields: title, slug, excerpt, content' }, 400);
    }

    if (rawData.status !== undefined && rawData.status !== 'draft' && rawData.status !== 'published') {
      return json({ error: 'Invalid status value' }, 400);
    }

    const status = (rawData.status === 'draft' || rawData.status === 'published'
      ? rawData.status
      : 'draft') as 'draft' | 'published';

    // Whitelist fields to prevent mass-assignment (id, timestamps, etc. are server-controlled)
    const insertData: Record<string, unknown> = {
      title: rawData.title.trim(),
      slug: rawData.slug.trim(),
      excerpt: rawData.excerpt.trim(),
      content: rawData.content.trim(),
      category_id: typeof rawData.category_id === 'string' && rawData.category_id ? rawData.category_id : null,
      author_id: typeof rawData.author_id === 'string' && rawData.author_id ? rawData.author_id : null,
      tags: Array.isArray(rawData.tags) ? rawData.tags.filter((t): t is string => typeof t === 'string') : [],
      featured_image: typeof rawData.featured_image === 'string' ? rawData.featured_image : null,
      status,
      seo_title: typeof rawData.seo_title === 'string' && rawData.seo_title ? rawData.seo_title : null,
      seo_description:
        typeof rawData.seo_description === 'string' && rawData.seo_description ? rawData.seo_description : null,
    };

    if (status === 'published') {
      insertData.published_at =
        typeof rawData.published_at === 'string' && rawData.published_at
          ? rawData.published_at
          : new Date().toISOString();
    }

    const supabase = getSupabaseServer();

    const { data: post, error } = await supabase
      .from('posts')
      .insert(insertData)
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
