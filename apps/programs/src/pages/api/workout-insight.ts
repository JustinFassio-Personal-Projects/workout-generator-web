import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import {
  extractAccessToken,
  getCurrentUserFromRequest,
} from '@/lib/supabase/admin/auth';
import { generateWorkoutRecoveryInsight } from '@/lib/gemini-server';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
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
    const heartRate = body.heartRate;
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return jsonError('sessionId is required', 400);
    }
    const hr = typeof heartRate === 'number' ? heartRate : Number(heartRate);
    if (!Number.isFinite(hr) || hr < 40 || hr > 220) {
      return jsonError('heartRate is required and must be 40–220', 400);
    }

    const minutesSinceLastSet =
      body.minutesSinceLastSet != null
        ? (typeof body.minutesSinceLastSet === 'number'
            ? body.minutesSinceLastSet
            : Number(body.minutesSinceLastSet))
        : undefined;
    if (
      minutesSinceLastSet != null &&
      (!Number.isFinite(minutesSinceLastSet) ||
        minutesSinceLastSet < 0 ||
        minutesSinceLastSet > 60)
    ) {
      return jsonError('minutesSinceLastSet must be 0–60 if provided', 400);
    }

    const notes =
      typeof body.notes === 'string' ? body.notes.trim() || undefined : undefined;
    const workoutTitle =
      typeof body.workoutTitle === 'string' ? body.workoutTitle : undefined;
    const programTitle =
      typeof body.programTitle === 'string' ? body.programTitle : undefined;
    const durationSeconds =
      body.durationSeconds != null
        ? (typeof body.durationSeconds === 'number'
            ? body.durationSeconds
            : Number(body.durationSeconds))
        : undefined;
    const exerciseCount =
      body.exerciseCount != null
        ? (typeof body.exerciseCount === 'number'
            ? body.exerciseCount
            : Number(body.exerciseCount))
        : undefined;

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

    const insight = await generateWorkoutRecoveryInsight({
      heartRate: hr,
      minutesSinceLastSet:
        minutesSinceLastSet != null && Number.isFinite(minutesSinceLastSet)
          ? minutesSinceLastSet
          : undefined,
      notes,
      workoutTitle,
      programTitle,
      durationSeconds:
        durationSeconds != null && Number.isFinite(durationSeconds)
          ? durationSeconds
          : undefined,
      exerciseCount:
        exerciseCount != null && Number.isFinite(exerciseCount)
          ? exerciseCount
          : undefined,
    });

    return new Response(JSON.stringify({ insight }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate insight';
    const lower = message.toLowerCase();
    const isRateLimit =
      lower.includes('429') ||
      lower.includes('rate limit') ||
      lower.includes('resource exhausted');
    if (isRateLimit) {
      return jsonError('Rate limit exceeded. Please try again shortly.', 429);
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[api/workout-insight] Error:', error);
    }
    return jsonError(message, 500);
  }
};
