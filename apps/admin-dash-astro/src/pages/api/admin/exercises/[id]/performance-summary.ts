/**
 * GET: Fetch performance summary (how to improve) for a tutorial.
 * Admin only. Used when user completes a Tutorial Lab session.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  generatePerformanceSummary,
  type ParsedBiomechanicsContext,
} from '@/lib/gemini-server';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, cookies }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Exercise ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await verifyAdminRequest(request, cookies);
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = getSupabaseServer();
    const { data: row, error: fetchError } = await supabase
      .from('generated_exercises')
      .select('exercise_name, biomechanics')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      return new Response(JSON.stringify({ error: 'Exercise not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const exerciseName = (row as { exercise_name: string }).exercise_name;
    const biomechanics = (row as { biomechanics: Record<string, unknown> | null })
      .biomechanics as ParsedBiomechanicsContext | null | undefined;

    const summary = await generatePerformanceSummary(exerciseName, biomechanics);

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[performance-summary] Error:', message);
    return new Response(JSON.stringify({ error: 'Failed to generate performance summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
