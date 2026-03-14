/**
 * Admin deep research API: GET list, POST create.
 * Mirrors admin-dash API shape for parity.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { validateDeepResearchPayload } from '@/lib/deep-research/validation';
import { sanitizeDeepResearchHtml } from '@/lib/deep-research/sanitize-html';
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
    const search = searchParams.get('search');

    let query = supabase
      .from('deep_research')
      .select('*')
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      const escaped = escapePostgrestFilterValue(search);
      query = query.or(`title.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`);
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

    const excerpt =
      typeof data.excerpt === 'string' && data.excerpt.trim().length > 0
        ? data.excerpt.trim()
        : null;

    // Whitelist fields to prevent mass-assignment (id, timestamps, etc. are server-controlled)
    const insertData = {
      title: data.title,
      slug: data.slug,
      excerpt,
      html_content: sanitizeDeepResearchHtml(
        typeof data.html_content === 'string' ? data.html_content : ''
      ),
      seo_title: typeof data.seo_title === 'string' ? data.seo_title : null,
      seo_description: typeof data.seo_description === 'string' ? data.seo_description : null,
      status,
      published_at:
        status === 'published'
          ? (typeof data.published_at === 'string' ? data.published_at : new Date().toISOString())
          : null,
      equipment_zones: Array.isArray(data.equipment_zones) ? data.equipment_zones : [],
      experience_levels: Array.isArray(data.experience_levels) ? data.experience_levels : [],
      injuries_addressed: Array.isArray(data.injuries_addressed) ? data.injuries_addressed : [],
      goals: Array.isArray(data.goals) ? data.goals : [],
      days_per_week_min: typeof data.days_per_week_min === 'number' ? data.days_per_week_min : null,
      days_per_week_max: typeof data.days_per_week_max === 'number' ? data.days_per_week_max : null,
      diet_types: Array.isArray(data.diet_types) ? data.diet_types : [],
      nutrition_goals: Array.isArray(data.nutrition_goals) ? data.nutrition_goals : [],
      dietary_restrictions: Array.isArray(data.dietary_restrictions)
        ? data.dietary_restrictions
        : [],
      macro_focus: Array.isArray(data.macro_focus) ? data.macro_focus : [],
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
