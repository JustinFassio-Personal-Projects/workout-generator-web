import type { APIRoute } from 'astro';

import { getAnalyticsGlossary } from '@/lib/admin/analytics-glossary';
import { ANALYTICS_DATASET_BY_KEY } from '@/lib/admin/analytics-datasets';
import { getHubActiveUsersFromFirestore } from '@/lib/firebase/engagement-hub';
import { getRetentionCohortStats, type RetentionParams } from '@/lib/firebase/retention-cohorts';
import { isFirebaseConfigured } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { getEngagementStats } from '@/lib/supabase/admin/analytics-engagement';
import { getMonetizationDropOffStats } from '@/lib/supabase/admin/analytics-monetization-dropoff';

type SupportedDatasetKey = 'monetization-dropoff' | 'engagement' | 'retention-cohorts';

function parseDays(url: URL): number {
  return Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') ?? '30', 10) || 30));
}

function parseRetentionParams(url: URL): { filters: Record<string, string | number | boolean>; params: RetentionParams } {
  const granularity = url.searchParams.get('granularity') === 'day' ? 'day' : 'week';
  const activeDefinition = url.searchParams.get('activeDefinition') === 'workout' ? 'workout' : 'session';

  if (granularity === 'week') {
    const cohortWeeks = Math.min(24, Math.max(4, parseInt(url.searchParams.get('cohortWeeks') ?? '12', 10) || 12));
    const periods = Math.min(24, Math.max(1, parseInt(url.searchParams.get('periods') ?? '13', 10) || 13));
    return {
      filters: { granularity, activeDefinition, cohortWeeks, periods },
      params: { granularity: 'week', cohortWeeks, periods, activeDefinition },
    };
  }

  const cohortDays = Math.min(90, Math.max(7, parseInt(url.searchParams.get('cohortDays') ?? '30', 10) || 30));
  const periods = Math.min(60, Math.max(1, parseInt(url.searchParams.get('periods') ?? '31', 10) || 31));
  return {
    filters: { granularity, activeDefinition, cohortDays, periods },
    params: { granularity: 'day', cohortDays, periods, activeDefinition },
  };
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);
    const datasetKey = url.searchParams.get('datasetKey') as SupportedDatasetKey | null;

    if (
      datasetKey !== 'monetization-dropoff' &&
      datasetKey !== 'engagement' &&
      datasetKey !== 'retention-cohorts'
    ) {
      return new Response(JSON.stringify({ error: 'Unsupported or missing datasetKey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dataset = ANALYTICS_DATASET_BY_KEY[datasetKey];
    const glossary = getAnalyticsGlossary(datasetKey) ?? { terms: [] };
    let filters: Record<string, string | number | boolean> = {};
    let data: unknown = null;

    if (datasetKey === 'monetization-dropoff') {
      const days = parseDays(url);
      filters = { days };
      data = await getMonetizationDropOffStats(days);
    } else if (datasetKey === 'engagement') {
      const days = parseDays(url);
      filters = { days };
      const stats = await getEngagementStats(days);

      let payload: Record<string, unknown> = {
        ...stats,
        activeUsersSource: 'supabase' as const,
      };

      if (isFirebaseConfigured()) {
        const hub = await getHubActiveUsersFromFirestore(days);
        if (hub) {
          payload = {
            ...payload,
            featureAdoptionHub: hub.featureAdoptionHub,
          };
          if (!hub.warnings?.length) {
            payload = {
              ...stats,
              dauByDay: hub.dauByDay,
              dau: hub.dau,
              wau: hub.wau,
              mau: hub.mau,
              stickiness: hub.stickiness,
              activeUsersSource: 'hub_firestore' as const,
              featureAdoptionHub: hub.featureAdoptionHub,
              featureAdoptionMarketing: stats.featureAdoptionMarketing,
            };
          } else {
            payload = {
              ...payload,
              engagementHubWarnings: hub.warnings,
            };
          }
        }
      }
      data = payload;
    } else {
      const parsed = parseRetentionParams(url);
      filters = parsed.filters;
      const result = await getRetentionCohortStats(parsed.params);
      if (!result) {
        data = {
          enabled: false,
          cohorts: [],
          source: 'firebase',
          granularity: parsed.params.granularity,
          activeDefinition: parsed.params.activeDefinition,
        };
      } else {
        data = result;
      }
    }

    return new Response(
      JSON.stringify({
        datasetKey,
        label: dataset?.label ?? datasetKey,
        generatedAt: new Date().toISOString(),
        filters,
        glossary,
        data,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
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
      console.error('[admin/growth-engine/context] Error:', error);
    }
    return new Response(JSON.stringify({ error: 'Failed to build growth engine context' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
