/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generate public-facing title and description from the finished program.
 * Uses scaffold + schedule to produce phase-by-phase copy.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { fetchFullProgram, getProgramScaffold } from '@/lib/supabase/admin/program-server';
import { parseJSONWithRepair } from '@/lib/json-parser';
import { buildPublicCopyPrompt, validatePublicCopyOutput } from '@/lib/prompt-chain';
import { callVertexAI } from '@/lib/vertex-ai-client';

export const POST: APIRoute = async ({ request, cookies }) => {
  let _adminInfo: { uid: string };
  try {
    _adminInfo = await verifyAdminRequest(request, cookies);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    return new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!request.body) {
      return new Response(JSON.stringify({ error: 'Request body is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as { programId?: string };
    const programId = body?.programId;
    if (!programId || typeof programId !== 'string') {
      return new Response(JSON.stringify({ error: 'programId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const projectId =
      import.meta.env.GOOGLE_PROJECT_ID || import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return new Response(
        JSON.stringify({
          error:
            'GOOGLE_PROJECT_ID or PUBLIC_FIREBASE_PROJECT_ID not set. Add one to .env for AI generation.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const [program, scaffold] = await Promise.all([
      fetchFullProgram(programId),
      getProgramScaffold(programId).catch(() => null),
    ]);

    if (!program) {
      return new Response(JSON.stringify({ error: 'Program not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const schedule = program.schedule ?? [];
    if (!schedule.length) {
      return new Response(
        JSON.stringify({ error: 'Program has no schedule; add workouts before generating public copy.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let accessToken: string;
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        projectId,
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      if (!tokenResponse.token) throw new Error('Failed to get access token');
      accessToken = tokenResponse.token;
    } catch (err) {
      console.error('[generate-public-copy] Auth error:', err);
      return new Response(
        JSON.stringify({
          error: 'Authentication failed. Run: gcloud auth application-default login',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = buildPublicCopyPrompt(program, scaffold);
    const region = import.meta.env.GOOGLE_LOCATION || 'global';

    const response = await callVertexAI({
      systemPrompt:
        'You are a fitness content writer. Output ONLY valid JSON with "title" and "description" keys. No markdown, no explanations.',
      userPrompt,
      accessToken,
      projectId,
      region,
      temperature: 0.5,
      maxTokens: 2048,
      logPrefix: '[generate-public-copy]',
    });

    const parsed = parseJSONWithRepair(response);
    const validation = validatePublicCopyOutput(parsed.data);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: `Invalid response: ${validation.error}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(validation.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-public-copy] Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to generate public title and description';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
