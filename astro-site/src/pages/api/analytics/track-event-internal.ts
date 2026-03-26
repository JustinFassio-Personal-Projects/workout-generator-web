/**
 * Server-to-server funnel inserts (e.g. Hub Stripe webhook). Requires ANALYTICS_FUNNEL_SERVER_SECRET.
 * Same rows as track-event; not CORS-exposed for browsers.
 */

import type { APIRoute } from 'astro';
import { getSupabaseForAnalytics } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_ID_MAX_LENGTH = 64;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function normalizeSessionId(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > SESSION_ID_MAX_LENGTH) return null;
  if (!SESSION_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

/** Subset allowed from trusted servers (hub API + webhook); keep tight. */
const INTERNAL_FUNNEL_EVENTS = new Set([
  'purchase_cta_checkout_started',
  'purchase_checkout_session_created',
  'purchase_return_success',
  'purchase_subscription_activated',
]);

interface Body {
  event_name?: string;
  session_id?: string | null;
  user_id?: string | null;
  properties?: Record<string, unknown>;
  app_id?: string;
}

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const secret =
      (typeof process !== 'undefined' && process.env?.ANALYTICS_FUNNEL_SERVER_SECRET) ||
      (import.meta.env.ANALYTICS_FUNNEL_SERVER_SECRET as string | undefined);
    if (!secret || typeof secret !== 'string') {
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const auth = request.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token || token !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const eventName =
      typeof body.event_name === 'string' && body.event_name ? body.event_name.trim() : null;
    if (!eventName || !INTERNAL_FUNNEL_EVENTS.has(eventName)) {
      return new Response(JSON.stringify({ error: 'Invalid event' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId =
      typeof body.user_id === 'string' && UUID_REGEX.test(body.user_id) ? body.user_id : null;
    const sessionId = normalizeSessionId(body.session_id);
    const properties =
      body.properties && typeof body.properties === 'object' ? body.properties : {};

    const supabase = getSupabaseForAnalytics();
    const idempotencyKey =
      properties && typeof properties.idempotency_key === 'string'
        ? (properties.idempotency_key as string)
        : null;

    if (idempotencyKey) {
      const { data: existingRows } = await supabase
        .from('analytics_funnel_events')
        .select('id')
        .eq('event_name', eventName)
        .eq('app_id', body.app_id ?? 'hub')
        .contains('properties', { idempotency_key: idempotencyKey })
        .limit(1);
      if ((existingRows ?? []).length > 0) {
        return new Response(null, { status: 204 });
      }
    }

    let enrichedProperties: Record<string, unknown> = properties;
    if (
      eventName === 'purchase_return_success' &&
      sessionId &&
      typeof properties.checkout_duration_seconds !== 'number'
    ) {
      const { data: startedRows } = await supabase
        .from('analytics_funnel_events')
        .select('timestamp')
        .eq('event_name', 'purchase_cta_checkout_started')
        .eq('app_id', body.app_id ?? 'hub')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true })
        .limit(1);

      const startedAtRaw = startedRows?.[0]?.timestamp;
      const startedMs =
        typeof startedAtRaw === 'string' ? Date.parse(startedAtRaw) : Number.NaN;
      if (Number.isFinite(startedMs)) {
        const durationSeconds = Math.max(
          0,
          Math.round((Date.now() - startedMs) / 1000)
        );
        enrichedProperties = {
          ...properties,
          checkout_duration_seconds: durationSeconds,
        };
      }
    }

    const { error } = await supabase.from('analytics_funnel_events').insert({
      event_name: eventName,
      user_id: userId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      properties: enrichedProperties,
      app_id: body.app_id ?? 'hub',
    });

    if (error) {
      if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
        console.error('[api/analytics/track-event-internal] Insert error:', error);
      }
      return new Response(JSON.stringify({ error: 'Insert failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[api/analytics/track-event-internal] Error:', err);
    }
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
