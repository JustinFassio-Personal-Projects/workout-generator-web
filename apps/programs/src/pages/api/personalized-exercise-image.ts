import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { extractAccessToken, getCurrentUserFromRequest } from '@/lib/supabase/admin/auth';
import { generatePersonalizedExerciseImage } from '@/lib/gemini-server';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

/** Check if string looks like a data URL: data:image/...;base64,... */
function isValidDataUrl(s: unknown): s is string {
  return typeof s === 'string' && /^data:image\/[^;]+;base64,/.test(s);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getCurrentUserFromRequest(request, cookies);
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) ?? {};
    } catch {
      return jsonError('Invalid request body. Expected JSON.', 400);
    }

    const sessionId = body.sessionId;
    const exerciseName = body.exerciseName;
    const referenceImage = body.referenceImage;

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return jsonError('sessionId is required', 400);
    }
    if (!exerciseName || typeof exerciseName !== 'string' || !exerciseName.trim()) {
      return jsonError('exerciseName is required', 400);
    }
    if (!isValidDataUrl(referenceImage)) {
      return jsonError(
        'referenceImage is required and must be a data URL (data:image/...;base64,...)',
        400
      );
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonError('Server configuration error', 500);
    }

    const token = extractAccessToken(request, cookies);
    if (!token) {
      return jsonError('Unauthorized', 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: session } = await supabase
      .from('user_workout_logs')
      .select('id')
      .eq('id', sessionId.trim())
      .single();

    if (!session) {
      return jsonError('Session not found or access denied', 404);
    }

    const image = await generatePersonalizedExerciseImage(exerciseName.trim(), referenceImage);

    return new Response(JSON.stringify({ image }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate image';
    const lower = message.toLowerCase();
    const isRateLimit =
      lower.includes('429') || lower.includes('rate limit') || lower.includes('resource exhausted');
    if (isRateLimit) {
      return jsonError('Rate limit exceeded. Please try again shortly.', 429);
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[api/personalized-exercise-image] Error:', error);
    }
    return jsonError(message, 500);
  }
};
