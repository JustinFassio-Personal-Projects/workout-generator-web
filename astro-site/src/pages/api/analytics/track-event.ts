/**
 * Funnel event API for onboarding/auth analytics. No auth required.
 * Writes to analytics_funnel_events (same Supabase project as admin-dash-astro).
 * Accepts cross-origin POST from hub (app) for account_signup_complete / account_login_complete.
 */

import type { APIRoute } from 'astro';
import { getSupabaseForAnalytics } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** session_id from getOrCreateSessionId (base36 timestamp + random); reject abuse on unauthenticated endpoint */
const SESSION_ID_MAX_LENGTH = 64;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function normalizeSessionId(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > SESSION_ID_MAX_LENGTH) return null;
  if (!SESSION_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

const FUNNEL_EVENT_WHITELIST = new Set([
  'onboarding_builder_started',
  'onboarding_builder_step_1_completed',
  'onboarding_builder_step_2_completed',
  'onboarding_builder_preview_shown',
  'onboarding_create_account_clicked',
  'account_signup_complete',
  'account_login_complete',
  // Hub monetization drop-off (Stripe checkout funnel; session_id = purchase_flow_id)
  'purchase_paywall_opened',
  'purchase_cta_checkout_started',
  'purchase_checkout_session_created',
  'purchase_stripe_redirect',
  'purchase_return_success',
]);

interface TrackEventBody {
  event_name: string;
  session_id?: string | null;
  user_id?: string | null;
  properties?: Record<string, unknown>;
  app_id?: string;
}

export const prerender = false;

/** Allowed CORS origins for hub → site track-event (comma-separated); default app domain + localhost. */
function getAllowedOrigins(): string[] {
  const env = import.meta.env.PUBLIC_ANALYTICS_CORS_ORIGIN;
  if (env && typeof env === 'string') {
    return env.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return ['https://app.aiworkoutgenerator.com', 'http://localhost:3000'];
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = getAllowedOrigins();
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export const OPTIONS: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
};

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  try {
    const body = (await request.json().catch(() => ({}))) as TrackEventBody;
    const eventName =
      typeof body.event_name === 'string' && body.event_name ? body.event_name.trim() : null;
    if (!eventName || !FUNNEL_EVENT_WHITELIST.has(eventName)) {
      return new Response(null, { status: 400, headers });
    }

    // RLS allows anon insert only when user_id IS NULL; hub sends session_id only for attribution
    const userId =
      typeof body.user_id === 'string' && UUID_REGEX.test(body.user_id) ? body.user_id : null;
    const sessionId = normalizeSessionId(body.session_id);
    const properties =
      body.properties && typeof body.properties === 'object' ? body.properties : {};

    const supabase = getSupabaseForAnalytics();
    const { error } = await supabase.from('analytics_funnel_events').insert({
      event_name: eventName,
      user_id: userId,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      properties,
      app_id: body.app_id ?? null,
    });

    if (error) {
      if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
        console.error('[api/analytics/track-event] Insert error:', error);
      }
      return new Response(null, { status: 500, headers });
    }

    return new Response(null, { status: 204, headers });
  } catch (err) {
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[api/analytics/track-event] Error:', err);
    }
    return new Response(null, { status: 500, headers });
  }
};
