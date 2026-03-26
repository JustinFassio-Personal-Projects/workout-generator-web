import { getRetentionCohortStats } from '@/lib/firebase/retention-cohorts';
import { getTtfkaHub } from '@/lib/firebase/ttfka-hub';
import { isFirebaseConfigured } from '@/lib/firebase/admin';
import { getAcquisitionStats } from '@/lib/supabase/admin/analytics-acquisition';

type SuggestionSeverity = 'P2' | 'P3';
type SuggestionChannel = 'email' | 'push' | 'in_app' | 'experiment';

export type MessagingSuggestion = {
  id: string;
  title: string;
  severity: SuggestionSeverity;
  rationale: string;
  channel: SuggestionChannel;
  segmentHint?: string;
  hypothesis: string;
  primaryMetric: string;
  primaryPage: string;
  messageVariant?: string;
  evidence: {
    path: string;
    label: string;
  };
};

type InputsSummary = {
  days: number;
  topLandingPath?: string;
  topLandingCount?: number;
  topUtm?: { source: string; medium: string; campaign: string; count: number };
  retentionW1Rate?: number;
  retentionCohortCount?: number;
  ttfkaNeverRatio?: number;
};

const LANDING_SHARE_THRESHOLD = 0.3;
const UTM_VOLUME_THRESHOLD = 20;
const RETENTION_W1_THRESHOLD = 0.2;
const TTFKA_NEVER_THRESHOLD = 0.5;

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export async function getMessagingSuggestions(days: number): Promise<{
  generatedAt: string;
  suggestions: MessagingSuggestion[];
  warnings: string[];
  inputsSummary: InputsSummary;
}> {
  const boundedDays = Math.min(90, Math.max(7, days));
  const warnings: string[] = [];

  const [acquisition, retention, ttfka] = await Promise.all([
    getAcquisitionStats(boundedDays),
    getRetentionCohortStats({
      granularity: 'week',
      cohortWeeks: 12,
      periods: 13,
      activeDefinition: 'session',
    }),
    isFirebaseConfigured() ? getTtfkaHub(boundedDays) : Promise.resolve(null),
  ]);

  if (!retention) {
    warnings.push('Retention cohorts unavailable (Firebase not configured or inaccessible).');
  } else if (retention.warnings?.length) {
    warnings.push(...retention.warnings.map((w) => `Retention: ${w}`));
  }

  if (!ttfka && isFirebaseConfigured()) {
    warnings.push('TTFKA unavailable (Firestore not configured or inaccessible).');
  } else if (ttfka?.warnings?.length) {
    warnings.push(...ttfka.warnings.map((w) => `TTFKA: ${w}`));
  }

  const suggestions: MessagingSuggestion[] = [];
  const topLanding = acquisition.topLandingPages[0];
  const landingTotal = acquisition.topLandingPages.reduce((sum, row) => sum + row.count, 0);
  const landingShare = landingTotal > 0 && topLanding ? topLanding.count / landingTotal : 0;
  const topUtm = acquisition.utmBreakdown[0];
  const retentionW1 = retention?.kpis?.find((k) => k.label === 'W1')?.rate;
  const ttfkaNeverRatio =
    ttfka && Object.values(ttfka.ttfkaDistributionHub).reduce((sum, count) => sum + count, 0) > 0
      ? ttfka.ttfkaDistributionHub.never /
        Object.values(ttfka.ttfkaDistributionHub).reduce((sum, count) => sum + count, 0)
      : undefined;

  if (topLanding && landingShare >= LANDING_SHARE_THRESHOLD) {
    suggestions.push({
      id: 'f-msg-landing-concentration',
      title: 'Run above-the-fold copy test for top landing page',
      severity: 'P2',
      channel: 'experiment',
      rationale: `${topLanding.path} drives ${pct(landingShare)} of tracked landing traffic in the last ${boundedDays} days.`,
      segmentHint: topLanding.path,
      hypothesis: 'Clarifying value proposition on the dominant landing page will increase handoff and signup conversion.',
      primaryMetric: 'account_signup_complete rate',
      primaryPage: topLanding.path,
      messageVariant: 'Value prop headline A/B',
      evidence: {
        path: '/analytics/details/acquisition',
        label: 'View acquisition detail',
      },
    });
  }

  if (topUtm && topUtm.count >= UTM_VOLUME_THRESHOLD) {
    const segment = [topUtm.source, topUtm.medium, topUtm.campaign].filter(Boolean).join(' / ');
    suggestions.push({
      id: 'f-msg-utm-segment',
      title: 'Target campaign-specific onboarding message',
      severity: 'P2',
      channel: 'email',
      rationale: `${segment || 'Top UTM segment'} produced ${topUtm.count} events in the last ${boundedDays} days.`,
      segmentHint: segment,
      hypothesis: 'Campaign-aligned onboarding language will improve first key action conversion.',
      primaryMetric: 'first key action completion rate',
      primaryPage: '/onboarding',
      messageVariant: segment ? `Campaign-tailored onboarding for ${segment}` : 'Campaign-tailored onboarding',
      evidence: {
        path: '/analytics/details/acquisition',
        label: 'View acquisition detail',
      },
    });
  }

  if (typeof retentionW1 === 'number' && retentionW1 < RETENTION_W1_THRESHOLD) {
    suggestions.push({
      id: 'f-msg-retention-reactivation',
      title: 'Queue week-1 reactivation lifecycle test',
      severity: 'P2',
      channel: 'push',
      rationale: `Pooled W1 retention is ${pct(retentionW1)} (threshold ${pct(RETENTION_W1_THRESHOLD)}).`,
      hypothesis: 'Contextual reminders in week 1 will increase return sessions and downstream conversion.',
      primaryMetric: 'W1 retention rate',
      primaryPage: '/dashboard',
      messageVariant: 'Week-1 win-back reminder',
      evidence: {
        path: '/analytics/details/retention-cohorts',
        label: 'View retention detail',
      },
    });
  }

  if (typeof ttfkaNeverRatio === 'number' && ttfkaNeverRatio >= TTFKA_NEVER_THRESHOLD) {
    suggestions.push({
      id: 'f-msg-ttfka-never',
      title: 'Add first-session checklist experiment',
      severity: 'P3',
      channel: 'in_app',
      rationale: `${pct(ttfkaNeverRatio)} of recent signups still have no key action (TTFKA = never).`,
      hypothesis: 'A guided first-session checklist will reduce no-action users and improve activation.',
      primaryMetric: 'TTFKA never ratio',
      primaryPage: '/dashboard',
      messageVariant: 'First-session checklist prompt',
      evidence: {
        path: '/analytics/details/engagement',
        label: 'View engagement detail',
      },
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    suggestions,
    warnings,
    inputsSummary: {
      days: boundedDays,
      topLandingPath: topLanding?.path,
      topLandingCount: topLanding?.count,
      topUtm: topUtm
        ? {
            source: topUtm.source,
            medium: topUtm.medium,
            campaign: topUtm.campaign,
            count: topUtm.count,
          }
        : undefined,
      retentionW1Rate: retentionW1,
      retentionCohortCount: retention?.cohorts?.length,
      ttfkaNeverRatio,
    },
  };
}
