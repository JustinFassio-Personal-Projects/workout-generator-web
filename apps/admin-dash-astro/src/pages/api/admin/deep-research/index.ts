/**
 * Admin deep research API: GET list, POST create.
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

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    const supabase = getSupabaseServer();
    const searchParams = url.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('deep_research')
      .select('*')
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      return json({ error: error.message }, 500);
    }

    return json({ items: items || [] });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/deep-research] GET error:', error);
    return json({ error: 'Failed to fetch deep research' }, 500);
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

    const validation = validateDeepResearchPayload(data);
    if (!validation.ok) {
      return json({ error: validation.error }, validation.status);
    }

    if (
      data.status !== undefined &&
      data.status !== 'draft' &&
      data.status !== 'published'
    ) {
      return json(
        { error: 'Missing or invalid required field: status must be "draft" or "published"' },
        400
      );
    }

    const status = (data.status === 'draft' || data.status === 'published'
      ? data.status
      : 'draft') as 'draft' | 'published';

    if (status === 'published' && !data.published_at) {
      data.published_at = new Date().toISOString();
    }

    const excerpt =
      typeof data.excerpt === 'string' && data.excerpt.trim().length > 0
        ? data.excerpt.trim()
        : null;

    const insertData = {
      ...data,
      excerpt,
      status,
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
    };

    const supabase = getSupabaseServer();

    const { data: item, error } = await supabase
      .from('deep_research')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return json({ error: 'A deep research entry with this slug already exists' }, 400);
      }
      return json({ error: error.message }, 500);
    }

    notifyMainSiteRevalidate();

    return json({ item }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }
    }
    console.error('[admin/deep-research] POST error:', error);
    return json({ error: 'Failed to create deep research' }, 500);
  }
};
