/**
 * POST: Generate user-friendly instructions for an exercise (admin only).
 * Calls Gemini and stores result in generated_exercises.user_friendly_instructions.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import { generateUserFriendlyInstructions } from '@/lib/gemini-server';
import type { ParsedBiomechanicsContext } from '@/lib/gemini-server';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
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
    const biomechanics = (row as { biomechanics: Record<string, unknown> | null }).biomechanics as
      | ParsedBiomechanicsContext
      | null
      | undefined;

    const content = await generateUserFriendlyInstructions(exerciseName, biomechanics);

    const { error: updateError } = await supabase
      .from('generated_exercises')
      .update({
        user_friendly_instructions: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[generate-instructions] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save instructions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[generate-instructions] Error:', message);
    const isDev = import.meta.env.DEV;
    return new Response(
      JSON.stringify({
        error: isDev ? message : 'Failed to generate instructions',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
