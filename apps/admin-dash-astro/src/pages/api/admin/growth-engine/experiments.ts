import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

type ExperimentBody = {
  title?: string;
  hypothesis?: string;
  primary_metric?: string;
  primary_page?: string;
  message_variant?: string;
  linked_suggestion_id?: string;
  metadata?: Record<string, unknown>;
};

function isMissingTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'PGRST205';
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('growth_experiment_drafts')
      .select('id, created_at, updated_at, created_by, status, title, hypothesis, primary_metric, primary_page, message_variant, linked_suggestion_id, metadata')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      if (isMissingTableError(error)) {
        return new Response(JSON.stringify({ rows: [], schemaReady: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }
    return new Response(JSON.stringify({ rows: data ?? [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ((error as { message?: string })?.message ?? '');
    if (message === 'UNAUTHENTICATED' || message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/growth-engine/experiments GET] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch experiment drafts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { uid } = await verifyAdminRequest(request, cookies);
    const body = (await request.json()) as ExperimentBody;
    const title = (body.title ?? '').trim();
    const hypothesis = (body.hypothesis ?? '').trim();
    const primaryMetric = (body.primary_metric ?? '').trim();
    const primaryPage = (body.primary_page ?? '').trim();
    if (!title || !hypothesis || !primaryMetric || !primaryPage) {
      return new Response(
        JSON.stringify({ error: 'title, hypothesis, primary_metric, and primary_page are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('growth_experiment_drafts')
      .insert({
        created_by: uid,
        status: 'draft',
        title,
        hypothesis,
        primary_metric: primaryMetric,
        primary_page: primaryPage,
        message_variant: body.message_variant?.trim() || null,
        linked_suggestion_id: body.linked_suggestion_id?.trim() || null,
        metadata: body.metadata ?? null,
      })
      .select('id, created_at')
      .single();

    if (error || !data) {
      if (isMissingTableError(error)) {
        return new Response(
          JSON.stringify({
            ok: false,
            schemaReady: false,
            error: 'growth_experiment_drafts table is missing. Apply Phase F migration first.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw error ?? new Error('Failed to create experiment draft');
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ((error as { message?: string })?.message ?? '');
    if (message === 'UNAUTHENTICATED' || message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/growth-engine/experiments POST] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to create experiment draft' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
