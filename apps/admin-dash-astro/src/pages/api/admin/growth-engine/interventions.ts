import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

type InterventionBody = {
  directive_id?: string;
  directive_type?: string;
  channel?: string;
  target_type?: string;
  target_ids?: string[];
  notes?: string;
  outcome?: string;
  metadata?: Record<string, unknown>;
};

const ALLOWED_TARGET_TYPES = new Set(['user', 'cohort', 'segment', 'other']);
const ALLOWED_CHANNELS = new Set(['push', 'email', 'in_app', 'experiment', 'eng_ticket', 'other']);

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703' || code === 'PGRST204';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { uid } = await verifyAdminRequest(request, cookies);
    const body = (await request.json()) as InterventionBody;
    const targetType = (body.target_type ?? '').trim().toLowerCase();
    const channel = (body.channel ?? '').trim().toLowerCase();
    const directiveType = (body.directive_type ?? '').trim();

    if (!targetType || !ALLOWED_TARGET_TYPES.has(targetType)) {
      return new Response(JSON.stringify({ error: 'target_type must be one of: user, cohort, segment, other' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (body.target_ids && !Array.isArray(body.target_ids)) {
      return new Response(JSON.stringify({ error: 'target_ids must be an array of strings' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (channel && !ALLOWED_CHANNELS.has(channel)) {
      return new Response(
        JSON.stringify({ error: 'channel must be one of: push, email, in_app, experiment, eng_ticket, other' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    if (body.metadata && (typeof body.metadata !== 'object' || Array.isArray(body.metadata))) {
      return new Response(JSON.stringify({ error: 'metadata must be an object' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const targetIds = (body.target_ids ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);
    const supabase = getSupabaseServiceRole();

    let { data, error } = await supabase
      .from('intervention_logs')
      .insert({
        actor_id: uid,
        directive_id: body.directive_id ?? null,
        directive_type: directiveType || null,
        channel: channel || null,
        target_type: targetType,
        target_ids: targetIds.length ? targetIds : null,
        notes: body.notes ?? null,
        outcome: body.outcome ?? null,
        metadata: body.metadata ?? null,
      })
      .select('id, created_at')
      .single();

    if (error && isMissingColumnError(error)) {
      const fallback = await supabase
        .from('intervention_logs')
        .insert({
          actor_id: uid,
          directive_id: body.directive_id ?? null,
          target_type: targetType,
          target_ids: targetIds.length ? targetIds : null,
          notes: body.notes ?? null,
          outcome: body.outcome ?? null,
        })
        .select('id, created_at')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data) {
      throw error ?? new Error('Failed to insert intervention log');
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
      console.error('[admin/growth-engine/interventions] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to log intervention' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const ALL: APIRoute = async () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
