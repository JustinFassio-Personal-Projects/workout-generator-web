/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Update program scaffold (program_template) for a program. Used when admin edits scaffold before building phases.
 */

import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { updateProgramScaffold, getProgramScaffold } from '@/lib/supabase/admin/program-server';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { ProgramTemplateScaffold } from '@/types/ai-program';

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  let adminInfo: { uid: string };
  try {
    adminInfo = await verifyAdminRequest(request, cookies);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    return new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const programId = params.programId;
  if (!programId) {
    return new Response(JSON.stringify({ error: 'Program ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { scaffold: ProgramTemplateScaffold };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON with scaffold.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.scaffold || !Array.isArray(body.scaffold.phases)) {
    return new Response(JSON.stringify({ error: 'scaffold.phases is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabaseServer();
  const { data: programRow, error: fetchError } = await supabase
    .from('programs')
    .select('id, trainer_id')
    .eq('id', programId)
    .single();

  if (fetchError || !programRow) {
    return new Response(JSON.stringify({ error: 'Program not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const trainerId = (programRow as { trainer_id: string }).trainer_id;
  if (trainerId !== adminInfo.uid) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const totalWeeks = body.scaffold.phases.reduce((sum, p) => sum + (p.weeks || 0), 0);
  const scaffold: ProgramTemplateScaffold = {
    phases: body.scaffold.phases,
    totalWeeks: body.scaffold.totalWeeks ?? totalWeeks,
  };

  try {
    await updateProgramScaffold(programId, scaffold);
    const updated = await getProgramScaffold(programId);
    return new Response(JSON.stringify({ scaffold: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update scaffold';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ request, params, cookies }) => {
  try {
    await verifyAdminRequest(request, cookies);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    return new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const programId = params.programId;
  if (!programId) {
    return new Response(JSON.stringify({ error: 'Program ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const scaffold = await getProgramScaffold(programId);
    return new Response(JSON.stringify({ scaffold }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const msg = err instanceof Error ? err.message : 'Failed to fetch scaffold';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
