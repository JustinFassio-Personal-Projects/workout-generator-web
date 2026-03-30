import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { runLifecycleAutomationJob } from '@/lib/admin/growth-engine/lifecycle-job';

async function authorizeJobRequest(request: Request, cookies: Parameters<typeof verifyAdminRequest>[1]) {
  const cronKey = process.env.GROWTH_ENGINE_CRON_KEY;
  const headerKey = request.headers.get('x-growth-engine-cron-key');
  if (cronKey && headerKey && headerKey === cronKey) {
    return;
  }
  await verifyAdminRequest(request, cookies);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await authorizeJobRequest(request, cookies);
    const result = await runLifecycleAutomationJob();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ((error as { message?: string })?.message ?? '');
    if (message === 'UNAUTHENTICATED' || message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/growth-engine/jobs/lifecycle] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to run lifecycle automation job' }), {
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
