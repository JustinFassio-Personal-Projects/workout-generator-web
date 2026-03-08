/**
 * POST: Generate Tutorial Lab config from exercise data (admin only).
 * Optionally save to generated_exercises.tutorial_config via body { save: true }.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  generateTutorialConfig,
  type ParsedBiomechanicsContext,
} from '@/lib/gemini-server';

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
      .select('exercise_name, biomechanics, user_friendly_instructions')
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
    const userFriendlyInstructions = (row as { user_friendly_instructions: string | null })
      .user_friendly_instructions;

    const config = await generateTutorialConfig(exerciseName, {
      biomechanics,
      userFriendlyInstructions: userFriendlyInstructions ?? undefined,
    });

    let saveRequested = false;
    try {
      const body = (await request.json()) as { save?: boolean } | null;
      saveRequested = body?.save === true;
    } catch {
      // No body or invalid JSON; don't save
    }

    if (saveRequested) {
      const { error: updateError } = await supabase
        .from('generated_exercises')
        .update({
          tutorial_config: config as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('[generate-tutorial] Update error:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to save tutorial config' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({ config, saved: saveRequested }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-tutorial] Error:', message);
    return new Response(JSON.stringify({ error: 'Failed to generate tutorial config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
