/**
 * Admin deep research API: GET one, PUT update, DELETE.
 * Mirrors admin-dash API shape for parity.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { validateDeepResearchPayload } from '@/lib/deep-research/validation';
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

    const { data: item, error } = await supabase
      .from('deep_research')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !item) {
      return json({ error: 'Deep research not found' }, 404);
    }

    return json({ item });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/deep-research/[slug]] GET error:', error);
    return json({ error: 'Failed to fetch deep research' }, 500);
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

    const validation = validateDeepResearchPayload(rawData);
    if (!validation.ok) {
      return json({ error: validation.error }, validation.status);
    }

    if (
      rawData.status !== undefined &&
      rawData.status !== 'draft' &&
      rawData.status !== 'published'
    ) {
      return json({ error: 'Invalid status value' }, 400);
    }

    const supabase = getSupabaseServer();

    const { data: currentItem, error: fetchError } = await supabase
      .from('deep_research')
      .select('status')
      .eq('slug', slug)
      .single();

    if (fetchError || !currentItem) {
      return json({ error: 'Deep research not found' }, 404);
    }

    const excerpt =
      typeof rawData.excerpt === 'string' && rawData.excerpt.trim().length > 0
        ? rawData.excerpt.trim()
        : null;

    const updateData: Record<string, unknown> = {
      title: rawData.title,
      slug: rawData.slug,
      excerpt,
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
    };

    if (updateData.status === 'published' && currentItem.status === 'draft') {
      updateData.published_at = new Date().toISOString();
    }

    const { data: item, error } = await supabase
      .from('deep_research')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return json({ error: 'A deep research entry with this slug already exists' }, 400);
      }
      return json({ error: error.message }, 500);
    }

    notifyMainSiteRevalidate();

    return json({ item });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/deep-research/[slug]] PUT error:', error);
    return json({ error: 'Failed to update deep research' }, 500);
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
    const { error } = await supabase.from('deep_research').delete().eq('slug', slug);

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
    console.error('[admin/deep-research/[slug]] DELETE error:', error);
    return json({ error: 'Failed to delete deep research' }, 500);
  }
};
