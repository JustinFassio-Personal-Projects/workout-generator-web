import type { APIRoute } from 'astro';

import { getGrowthFeatureRoi } from '@/lib/admin/growth-engine/feature-roi';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const days = Math.min(90, Math.max(7, parseInt(url.searchParams.get('days') ?? '30', 10) || 30));
    const correlationWindowDays = Math.min(
      180,
      Math.max(days, parseInt(url.searchParams.get('correlationWindowDays') ?? '90', 10) || 90)
    );

    const result = await getGrowthFeatureRoi({ days, correlationWindowDays });
    return new Response(
      JSON.stringify({
        generatedAt: result.generatedAt,
        rows: result.rows,
        warnings: result.warnings,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ((error as { message?: string })?.message ?? '');
    if (message === 'UNAUTHENTICATED' || message === 'UNAUTHORIZED') {
      return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/growth-engine/feature-roi] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to fetch feature ROI matrix' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
