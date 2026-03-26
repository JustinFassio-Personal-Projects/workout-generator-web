/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics dashboard shell (Phase 0). Overview from analytics_funnel_events; Phase 1 Acquisition section.
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface AnalyticsOverview {
  from: string;
  to: string;
  totalEvents: number;
  distinctUsers: number;
}

interface AcquisitionStats {
  uniqueVisitorsByDay: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  utmBreakdown: { source: string; medium: string; campaign: string; count: number }[];
  topLandingPages: { path: string; count: number }[];
  deviceBrowser: { device: string; browser: string; count: number }[];
  geo: { country: string; count: number }[];
}

interface AuthFunnelStats {
  signUpsByDay: { date: string; count: number }[];
  signInsByDay: { date: string; count: number }[];
  funnel: { visit: number; signUp: number; emailConfirmed: number; firstAction: number };
  oauthVsEmail: { oauth: number; email: number };
  ttfkaDistributionMarketing: {
    under15m: number;
    '15mTo1h': number;
    '1hTo24h': number;
    '1dTo7d': number;
    '7dPlus': number;
    never: number;
  };
  ttfkaDistributionHub?: {
    under15m: number;
    '15mTo1h': number;
    '1hTo24h': number;
    '1dTo7d': number;
    '7dPlus': number;
    never: number;
  };
  ttfkaHubWarnings?: string[];
  onboardingDropOff?: { step: string; completed: number; dropped: number }[];
  handoff?: {
    firebaseSignups: number;
    attributedSignups: number;
    signUpsByDay?: { date: string; count: number }[];
  } | null;
}

interface FeatureAdoptionRow {
  eventName: string;
  count7d: number;
  count30d: number;
  displayLabel?: string;
}

interface EngagementStats {
  dauByDay: { date: string; count: number }[];
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  sessionCount: number;
  avgSessionDurationMinutes: number;
  avgPagesPerSession: number;
  featureAdoptionMarketing?: FeatureAdoptionRow[];
  featureAdoptionHub?: FeatureAdoptionRow[];
  powerUserDistribution: { bucket: string; count: number }[];
  /** Hub: Firestore user_activity_logs; otherwise Supabase funnel/web_events */
  activeUsersSource?: 'hub_firestore' | 'supabase';
  engagementHubWarnings?: string[];
}

interface MonetizationStats {
  activeByPlan: { planName: string; planIndex: number; count: number; price: number }[];
  activePaidCount: number;
  activeTrialCount: number;
  trialConversionRate: number;
  trialConverted: number;
  trialEligible: number;
  ttfcDistribution: {
    sameDay: number;
    oneToTwoDays: number;
    threeToSevenDays: number;
    sevenPlusDays: number;
  };
  estimatedMrr: number;
  arpu: number;
  ltvHeuristic: number;
}

interface QualityStats {
  errorsByPage: { page: string; count: number }[];
  totalErrors: number;
  topErrors: { message: string; count: number }[];
  errorsByDay: { date: string; count: number }[];
}

interface RetentionCohortRow {
  label: string;
  start: string;
  end: string;
  size: number;
  retained: number[];
  rates: number[];
}

interface RetentionCohortsStats {
  enabled?: boolean;
  granularity: string;
  activeDefinition?: 'session' | 'workout';
  cohorts: RetentionCohortRow[];
  source: string;
  kpis?: { label: string; rate: number }[];
  warnings?: string[];
}

interface MonetizationCandidateRow {
  uid: string;
  displayName?: string;
  signupAt: string;
  lastActivityAt: string;
  signupAgeDays: number;
  signals: {
    workoutEvents: number;
    sessionEvents: number;
    distinctDays: number;
    totalActiveDays: number;
  };
  reasons: string[];
}

interface MonetizationDropOffRow {
  step: string;
  completed: number;
  dropped: number;
}

interface MonetizationCandidatesStats {
  enabled?: boolean;
  segment: 'new' | 'return';
  generatedAt: string;
  candidates: MonetizationCandidateRow[];
  source: string;
  totalActiveLookbackDays?: number;
  warnings?: string[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateUrl(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + '...';
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-6">
      <h2 className="mb-2 font-heading text-xl font-bold">{title}</h2>
      <p className="text-white/60">Coming soon</p>
    </div>
  );
}

const AnalyticsView: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionStats | null>(null);
  const [authFunnel, setAuthFunnel] = useState<AuthFunnelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [acqLoading, setAcqLoading] = useState(true);
  const [authFunnelLoading, setAuthFunnelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acqError, setAcqError] = useState<string | null>(null);
  const [authFunnelError, setAuthFunnelError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [monetization, setMonetization] = useState<MonetizationStats | null>(null);
  const [monetizationLoading, setMonetizationLoading] = useState(true);
  const [monetizationError, setMonetizationError] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityStats | null>(null);
  const [qualityLoading, setQualityLoading] = useState(true);
  const [qualityError, setQualityError] = useState<string | null>(null);
  const [retention, setRetention] = useState<RetentionCohortsStats | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(true);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [retentionGranularity, setRetentionGranularity] = useState<'week' | 'day'>('week');
  const [retentionActiveDefinition, setRetentionActiveDefinition] = useState<
    'session' | 'workout'
  >('session');
  const [candidates, setCandidates] = useState<MonetizationCandidatesStats | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [candidatesSegment, setCandidatesSegment] = useState<'new' | 'return'>('new');
  const [monetizationDropOff, setMonetizationDropOff] = useState<MonetizationDropOffRow[] | null>(
    null
  );
  const [monetizationDropOffLoading, setMonetizationDropOffLoading] = useState(true);
  const [monetizationDropOffError, setMonetizationDropOffError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/analytics/overview?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as AnalyticsOverview | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setOverview(data as AnalyticsOverview);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics overview');
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [days]);

  useEffect(() => {
    const fetchAcquisition = async () => {
      try {
        setAcqLoading(true);
        setAcqError(null);
        const res = await fetch(`/api/admin/analytics/acquisition?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as AcquisitionStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setAcquisition(data as AcquisitionStats);
      } catch (err) {
        setAcqError(err instanceof Error ? err.message : 'Failed to load acquisition stats');
        setAcquisition(null);
      } finally {
        setAcqLoading(false);
      }
    };
    fetchAcquisition();
  }, [days]);

  useEffect(() => {
    const fetchAuthFunnel = async () => {
      try {
        setAuthFunnelLoading(true);
        setAuthFunnelError(null);
        const res = await fetch(`/api/admin/analytics/auth-funnel?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as AuthFunnelStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setAuthFunnel(data as AuthFunnelStats);
      } catch (err) {
        setAuthFunnelError(err instanceof Error ? err.message : 'Failed to load auth funnel stats');
        setAuthFunnel(null);
      } finally {
        setAuthFunnelLoading(false);
      }
    };
    fetchAuthFunnel();
  }, [days]);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        setEngagementLoading(true);
        setEngagementError(null);
        const res = await fetch(`/api/admin/analytics/engagement?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as EngagementStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setEngagement(data as EngagementStats);
      } catch (err) {
        setEngagementError(err instanceof Error ? err.message : 'Failed to load engagement stats');
        setEngagement(null);
      } finally {
        setEngagementLoading(false);
      }
    };
    fetchEngagement();
  }, [days]);

  useEffect(() => {
    const fetchMonetization = async () => {
      try {
        setMonetizationLoading(true);
        setMonetizationError(null);
        const res = await fetch(`/api/admin/analytics/monetization?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as MonetizationStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setMonetization(data as MonetizationStats);
      } catch (err) {
        setMonetizationError(
          err instanceof Error ? err.message : 'Failed to load monetization stats'
        );
        setMonetization(null);
      } finally {
        setMonetizationLoading(false);
      }
    };
    fetchMonetization();
  }, [days]);

  useEffect(() => {
    const fetchQuality = async () => {
      try {
        setQualityLoading(true);
        setQualityError(null);
        const res = await fetch(`/api/admin/analytics/quality?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as QualityStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setQuality(data as QualityStats);
      } catch (err) {
        setQualityError(err instanceof Error ? err.message : 'Failed to load quality stats');
        setQuality(null);
      } finally {
        setQualityLoading(false);
      }
    };
    fetchQuality();
  }, [days]);

  useEffect(() => {
    const fetchRetention = async () => {
      try {
        setRetentionLoading(true);
        setRetentionError(null);
        const baseParams =
          retentionGranularity === 'week'
            ? 'cohortWeeks=12&periods=13&granularity=week'
            : 'cohortDays=30&periods=31&granularity=day';
        const params = `${baseParams}&activeDefinition=${retentionActiveDefinition}`;
        const res = await fetch(
          `/api/admin/analytics/retention-cohorts?${params}`,
          { credentials: 'include' }
        );
        const data = (await res.json()) as RetentionCohortsStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setRetention(data as RetentionCohortsStats);
      } catch (err) {
        setRetentionError(
          err instanceof Error ? err.message : 'Failed to load retention cohort stats'
        );
        setRetention(null);
      } finally {
        setRetentionLoading(false);
      }
    };
    fetchRetention();
  }, [retentionGranularity, retentionActiveDefinition]);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setCandidatesLoading(true);
        setCandidatesError(null);
        const params = `segment=${candidatesSegment}&windowDays=14&recentDays=7&limit=50&totalActiveLookbackDays=365`;
        const res = await fetch(
          `/api/admin/analytics/monetization-candidates?${params}`,
          { credentials: 'include' }
        );
        const data = (await res.json()) as MonetizationCandidatesStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setCandidates(data as MonetizationCandidatesStats);
      } catch (err) {
        setCandidatesError(
          err instanceof Error ? err.message : 'Failed to load monetization candidates'
        );
        setCandidates(null);
      } finally {
        setCandidatesLoading(false);
      }
    };
    fetchCandidates();
  }, [candidatesSegment]);

  useEffect(() => {
    const fetchMonetizationDropOff = async () => {
      try {
        setMonetizationDropOffLoading(true);
        setMonetizationDropOffError(null);
        const res = await fetch(`/api/admin/analytics/monetization-dropoff?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as
          | { monetizationDropOff: MonetizationDropOffRow[] }
          | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setMonetizationDropOff(
          (data as { monetizationDropOff: MonetizationDropOffRow[] }).monetizationDropOff ?? null
        );
      } catch (err) {
        setMonetizationDropOffError(
          err instanceof Error ? err.message : 'Failed to load monetization drop-off'
        );
        setMonetizationDropOff(null);
      } finally {
        setMonetizationDropOffLoading(false);
      }
    };
    fetchMonetizationDropOff();
  }, [days]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Analytics</h1>
          <p className="mt-2 text-white/60">
            {overview
              ? `${formatDate(overview.from)} – ${formatDate(overview.to)}`
              : 'Select a range'}
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-white"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      {/* Overview card */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 font-heading text-xl font-bold">Overview</h2>
        {loading && <p className="text-white/60">Loading…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && overview && (
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-sm text-white/60">Total events</p>
              <p className="text-2xl font-semibold">{overview.totalEvents.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Distinct users</p>
              <p className="text-2xl font-semibold">{overview.distinctUsers.toLocaleString()}</p>
            </div>
          </div>
        )}
        {!loading && !error && !overview && <p className="text-white/60">No data</p>}
      </div>

      {/* Acquisition & traffic (Phase 1) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 font-heading text-xl font-bold">Acquisition & traffic</h2>
        {acqLoading && <p className="text-white/60">Loading…</p>}
        {acqError && <p className="text-red-400">{acqError}</p>}
        {!acqLoading && !acqError && acquisition && (
          <div className="space-y-8">
            {/* Unique visitors over time */}
            {acquisition.uniqueVisitorsByDay.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">
                  Unique visitors over time
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={acquisition.uniqueVisitorsByDay}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#ffbf00"
                        strokeWidth={2}
                        dot={false}
                        name="Visitors"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid gap-8 md:grid-cols-2">
              {/* Top referrers */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Top referrers</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Referrer</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {acquisition.topReferrers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-center text-white/50">
                            No referrer data
                          </td>
                        </tr>
                      ) : (
                        acquisition.topReferrers.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-white/80" title={r.referrer}>
                              {truncateUrl(r.referrer, 50)}
                            </td>
                            <td className="px-3 py-2 text-right text-white/70">
                              {r.count.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top landing pages */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Top landing pages</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Path</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {acquisition.topLandingPages.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-3 py-4 text-center text-white/50">
                            No landing page data
                          </td>
                        </tr>
                      ) : (
                        acquisition.topLandingPages.slice(0, 10).map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-xs text-white/80">
                              {p.path || '/'}
                            </td>
                            <td className="px-3 py-2 text-right text-white/70">
                              {p.count.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* UTM breakdown */}
            {acquisition.utmBreakdown.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">UTM breakdown</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Source</th>
                        <th className="px-3 py-2 text-left text-white/80">Medium</th>
                        <th className="px-3 py-2 text-left text-white/80">Campaign</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {acquisition.utmBreakdown.slice(0, 15).map((u, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-white/80">{u.source}</td>
                          <td className="px-3 py-2 text-white/80">{u.medium}</td>
                          <td className="px-3 py-2 text-white/80">{u.campaign}</td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {u.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Device & browser */}
            {acquisition.deviceBrowser.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Device & browser</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Device</th>
                        <th className="px-3 py-2 text-left text-white/80">Browser</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {acquisition.deviceBrowser.slice(0, 10).map((d, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-white/80">{d.device}</td>
                          <td className="px-3 py-2 text-white/80">{d.browser}</td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {d.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Geo */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Geography</h3>
              {acquisition.geo.length === 0 ? (
                <p className="text-white/50">No geo data</p>
              ) : (
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Country</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {acquisition.geo.map((g, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-white/80">{g.country}</td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {g.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {!acqLoading && !acqError && !acquisition && (
          <p className="text-white/60">No acquisition data</p>
        )}
      </div>

      {/* Auth & onboarding (Phase 2) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 font-heading text-xl font-bold">Auth & onboarding</h2>
        {authFunnelLoading && <p className="text-white/60">Loading…</p>}
        {authFunnelError && <p className="text-red-400">{authFunnelError}</p>}
        {!authFunnelLoading && !authFunnelError && authFunnel && (
          <div className="space-y-8">
            {/* Sign-ins and sign-ups by day */}
            {(authFunnel.signInsByDay.length > 0 || authFunnel.signUpsByDay.length > 0) &&
              (() => {
                const dateSet = new Set<string>();
                authFunnel.signInsByDay.forEach((r) => dateSet.add(r.date));
                authFunnel.signUpsByDay.forEach((r) => dateSet.add(r.date));
                const signInsMap = new Map(authFunnel.signInsByDay.map((r) => [r.date, r.count]));
                const signUpsMap = new Map(authFunnel.signUpsByDay.map((r) => [r.date, r.count]));
                const combined = Array.from(dateSet)
                  .sort()
                  .map((date) => ({
                    date,
                    signIns: signInsMap.get(date) ?? 0,
                    signUps: signUpsMap.get(date) ?? 0,
                  }));
                return (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-white/70">
                      Sign-ins and sign-ups by day
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={combined}
                          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                          />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }}
                            labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="signIns"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name="Sign-ins"
                          />
                          <Line
                            type="monotone"
                            dataKey="signUps"
                            stroke="#ffbf00"
                            strokeWidth={2}
                            dot={false}
                            name="Sign-ups"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

            {/* Funnel: visit -> sign_up -> email_confirmed -> first_action */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Conversion funnel</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded border border-white/10 bg-black/30 px-4 py-2">
                  <p className="text-xs text-white/50">Visit</p>
                  <p className="text-lg font-semibold">
                    {authFunnel.funnel.visit.toLocaleString()}
                  </p>
                </div>
                <span className="text-white/40">→</span>
                <div className="rounded border border-white/10 bg-black/30 px-4 py-2">
                  <p className="text-xs text-white/50">Sign up</p>
                  <p className="text-lg font-semibold">
                    {authFunnel.funnel.signUp.toLocaleString()}
                  </p>
                </div>
                <span className="text-white/40">→</span>
                <div className="rounded border border-white/10 bg-black/30 px-4 py-2">
                  <p className="text-xs text-white/50">Email confirmed</p>
                  <p className="text-lg font-semibold">
                    {authFunnel.funnel.emailConfirmed.toLocaleString()}
                  </p>
                </div>
                <span className="text-white/40">→</span>
                <div className="rounded border border-white/10 bg-black/30 px-4 py-2">
                  <p className="text-xs text-white/50">First action</p>
                  <p className="text-lg font-semibold">
                    {authFunnel.funnel.firstAction.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* OAuth vs email */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">OAuth vs email</h3>
              {authFunnel.oauthVsEmail.oauth > 0 || authFunnel.oauthVsEmail.email > 0 ? (
                <div className="flex items-center gap-8">
                  <div className="h-40 w-40">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'OAuth', value: authFunnel.oauthVsEmail.oauth, color: '#22c55e' },
                          { name: 'Email', value: authFunnel.oauthVsEmail.email, color: '#ffbf00' },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {[
                          { name: 'OAuth', color: '#22c55e' },
                          { name: 'Email', color: '#ffbf00' },
                        ].map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </div>
                  <div className="text-sm text-white/70">
                    <p>OAuth: {authFunnel.oauthVsEmail.oauth.toLocaleString()}</p>
                    <p>Email: {authFunnel.oauthVsEmail.email.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-white/50">No auth method data</p>
              )}
            </div>

            {/* TTFKA: Hub (Firestore) + Marketing & timer (Supabase) */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Time to first key action</h3>
              {authFunnel.ttfkaHubWarnings && authFunnel.ttfkaHubWarnings.length > 0 && (
                <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {authFunnel.ttfkaHubWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}
              {authFunnel.ttfkaDistributionHub && (
                <div className="mb-6">
                  <h4 className="mb-2 text-xs font-medium text-white/60">
                    Hub (Firestore)
                  </h4>
                  <p className="mb-2 text-xs text-white/50">
                    Signup = Auth creation; first key = workout:* or profile:onboarding_complete from{' '}
                    <code className="rounded bg-white/10 px-1">user_activity_logs</code>.
                  </p>
                  <div className="overflow-hidden rounded border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-black/30">
                        <tr>
                          <th className="px-3 py-2 text-left text-white/80">Bucket</th>
                          <th className="px-3 py-2 text-right text-white/80">Users</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr><td className="px-3 py-2 text-white/80">&lt; 15 minutes</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionHub.under15m.toLocaleString()}</td></tr>
                        <tr><td className="px-3 py-2 text-white/80">15 min – 1 hour</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionHub['15mTo1h'].toLocaleString()}</td></tr>
                        <tr><td className="px-3 py-2 text-white/80">1 – 24 hours</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionHub['1hTo24h'].toLocaleString()}</td></tr>
                        <tr><td className="px-3 py-2 text-white/80">1 – 7 days</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionHub['1dTo7d'].toLocaleString()}</td></tr>
                        <tr><td className="px-3 py-2 text-white/80">7+ days</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionHub['7dPlus'].toLocaleString()}</td></tr>
                        <tr><td className="px-3 py-2 text-white/80">Never</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionHub.never.toLocaleString()}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div>
                <h4 className="mb-2 text-xs font-medium text-white/60">
                  Marketing &amp; timer (Supabase)
                </h4>
                <p className="mb-2 text-xs text-white/50">
                  Signup = <code className="rounded bg-white/10 px-1">account_signup_complete</code>; first key = timer_session_complete or hub_timer_launch_1 from{' '}
                  <code className="rounded bg-white/10 px-1">analytics_funnel_events</code>.
                </p>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Bucket</th>
                        <th className="px-3 py-2 text-right text-white/80">Users</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr><td className="px-3 py-2 text-white/80">&lt; 15 minutes</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionMarketing.under15m.toLocaleString()}</td></tr>
                      <tr><td className="px-3 py-2 text-white/80">15 min – 1 hour</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionMarketing['15mTo1h'].toLocaleString()}</td></tr>
                      <tr><td className="px-3 py-2 text-white/80">1 – 24 hours</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionMarketing['1hTo24h'].toLocaleString()}</td></tr>
                      <tr><td className="px-3 py-2 text-white/80">1 – 7 days</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionMarketing['1dTo7d'].toLocaleString()}</td></tr>
                      <tr><td className="px-3 py-2 text-white/80">7+ days</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionMarketing['7dPlus'].toLocaleString()}</td></tr>
                      <tr><td className="px-3 py-2 text-white/80">Never</td><td className="px-3 py-2 text-right text-white/70">{authFunnel.ttfkaDistributionMarketing.never.toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Onboarding drop-off (optional) */}
            {authFunnel.onboardingDropOff && authFunnel.onboardingDropOff.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Onboarding drop-off</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Step</th>
                        <th className="px-3 py-2 text-right text-white/80">Completed</th>
                        <th className="px-3 py-2 text-right text-white/80">Dropped</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {authFunnel.onboardingDropOff.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-white/80">{row.step}</td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {row.completed.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {row.dropped.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Handoff: Website → Hub (when Firebase configured) */}
            {authFunnel.handoff != null && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Handoff: Website → Hub</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="px-3 py-2 text-white/80">Accounts created (Firebase)</td>
                        <td className="px-3 py-2 text-right text-white/70">
                          {authFunnel.handoff.firebaseSignups.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-white/80">Attributed to builder</td>
                        <td className="px-3 py-2 text-right text-white/70">
                          {authFunnel.handoff.attributedSignups.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {!authFunnelLoading && !authFunnelError && !authFunnel && (
          <p className="text-white/60">No auth funnel data</p>
        )}
      </div>

      {/* Engagement (Phase 3) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 font-heading text-xl font-bold">Engagement</h2>
        {engagementLoading && <p className="text-white/60">Loading…</p>}
        {engagementError && <p className="text-red-400">{engagementError}</p>}
        {!engagementLoading && !engagementError && engagement && (
          <div className="space-y-8">
            {engagement.engagementHubWarnings && engagement.engagementHubWarnings.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {engagement.engagementHubWarnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            {/* DAU over time */}
            {engagement.dauByDay.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">DAU over time</h3>
                {engagement.activeUsersSource === 'hub_firestore' && (
                  <p className="mb-2 text-xs text-white/50">
                    Distinct hub users (Firebase UID) with ≥1 activity log per UTC day — same source as
                    Retention &amp; cohorts.
                  </p>
                )}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={engagement.dauByDay}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#ffbf00"
                        strokeWidth={2}
                        dot={false}
                        name="DAU"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {engagement.activeUsersSource === 'hub_firestore' &&
              engagement.dauByDay.length === 0 && (
                <p className="text-sm text-white/60">
                  No hub activity logs in this date range. DAU/WAU/MAU use Firestore{' '}
                  <code className="rounded bg-white/10 px-1">user_activity_logs</code>.
                </p>
              )}

            {/* DAU / WAU / MAU / Stickiness cards */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Active users</h3>
              {engagement.activeUsersSource === 'hub_firestore' ? (
                <p className="mb-2 text-xs text-white/50">
                  DAU = distinct users on the latest day with any log; WAU / MAU = distinct users active
                  on ≥1 day in the last 7 / 30 UTC days; stickiness = WAU ÷ MAU.
                </p>
              ) : (
                <p className="mb-2 text-xs text-white/50">
                  From Supabase (funnel + web_events). Configure{' '}
                  <code className="rounded bg-white/10 px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code> to use
                  hub activity logs instead.
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">DAU</p>
                  <p className="text-xl font-semibold">{engagement.dau.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">WAU</p>
                  <p className="text-xl font-semibold">{engagement.wau.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">MAU</p>
                  <p className="text-xl font-semibold">{engagement.mau.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Stickiness</p>
                  <p className="text-xl font-semibold">
                    {engagement.mau > 0 ? `${(engagement.stickiness * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Session stats */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Sessions</h3>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Session count</p>
                  <p className="text-xl font-semibold">
                    {engagement.sessionCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Avg duration (min)</p>
                  <p className="text-xl font-semibold">
                    {engagement.avgSessionDurationMinutes.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Avg pages per session</p>
                  <p className="text-xl font-semibold">
                    {engagement.avgPagesPerSession.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature adoption: Hub (Firestore) + Marketing & timer (Supabase) */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Feature adoption</h3>

              {engagement.featureAdoptionHub && engagement.featureAdoptionHub.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-2 text-xs font-medium text-white/60">
                    Hub activity (Firestore)
                  </h4>
                  {engagement.activeUsersSource === 'hub_firestore' &&
                    engagement.featureAdoptionHub.every(
                      (r) => r.count7d === 0 && r.count30d === 0
                    ) && (
                      <p className="mb-2 text-xs text-white/50">
                        No hub activity logs in range. Data from{' '}
                        <code className="rounded bg-white/10 px-1">user_activity_logs</code>.
                      </p>
                    )}
                  <div className="overflow-hidden rounded border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-black/30">
                        <tr>
                          <th className="px-3 py-2 text-left text-white/80">Action</th>
                          <th className="px-3 py-2 text-right text-white/80">Last 7 days</th>
                          <th className="px-3 py-2 text-right text-white/80">Last 30 days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {engagement.featureAdoptionHub.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-white/80">
                              {row.displayLabel ?? row.eventName}
                            </td>
                            <td className="px-3 py-2 text-right text-white/70">
                              {row.count7d.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right text-white/70">
                              {row.count30d.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {engagement.featureAdoptionMarketing &&
                engagement.featureAdoptionMarketing.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-medium text-white/60">
                      Marketing &amp; timer (Supabase)
                    </h4>
                    <p className="mb-2 text-xs text-white/50">
                      Builder handoff, timer funnel events from{' '}
                      <code className="rounded bg-white/10 px-1">analytics_funnel_events</code>.
                    </p>
                    <div className="overflow-hidden rounded border border-white/10">
                      <table className="w-full text-sm">
                        <thead className="bg-black/30">
                          <tr>
                            <th className="px-3 py-2 text-left text-white/80">Event</th>
                            <th className="px-3 py-2 text-right text-white/80">Last 7 days</th>
                            <th className="px-3 py-2 text-right text-white/80">Last 30 days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {engagement.featureAdoptionMarketing.map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-mono text-xs text-white/80">
                                {row.eventName}
                              </td>
                              <td className="px-3 py-2 text-right text-white/70">
                                {row.count7d.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right text-white/70">
                                {row.count30d.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {(!engagement.featureAdoptionHub || engagement.featureAdoptionHub.length === 0) &&
                (!engagement.featureAdoptionMarketing ||
                  engagement.featureAdoptionMarketing.length === 0) && (
                  <p className="text-white/50">No feature adoption data</p>
                )}
            </div>

            {/* Power-user distribution */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">
                Power-user distribution (key events)
              </h3>
              {engagement.powerUserDistribution.some((b) => b.count > 0) ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={engagement.powerUserDistribution}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="bucket"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <Bar dataKey="count" fill="#ffbf00" name="Users" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-white/50">No power-user data in range</p>
              )}
            </div>
          </div>
        )}
        {!engagementLoading && !engagementError && !engagement && (
          <p className="text-white/60">No engagement data</p>
        )}
      </div>

      {/* Retention & cohorts (Firebase: hub activity logs + Auth signup week/day) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">Retention & cohorts</h2>
            <p className="mt-1 text-sm text-white/60">
              Data from Firebase (hub activity logs + Auth signup).{' '}
              {retentionActiveDefinition === 'session'
                ? 'Session = app:open, app:session_start'
                : 'Workout = any workout:* event (generate, open, start, complete, save, share)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Active definition:</span>
              <select
                value={retentionActiveDefinition}
                onChange={(e) =>
                  setRetentionActiveDefinition(e.target.value as 'session' | 'workout')
                }
                disabled={retentionLoading}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="session">Session (opens)</option>
                <option value="workout">Workout (engagement)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Granularity:</span>
              <select
                value={retentionGranularity}
                onChange={(e) => setRetentionGranularity(e.target.value as 'week' | 'day')}
                disabled={retentionLoading}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="week">Week</option>
                <option value="day">Day</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!retention?.cohorts?.length || retentionLoading) return;
                const prefix =
                  retention.granularity === 'day' ? 'D' : 'W';
                const periodCount = retention.cohorts[0]?.rates?.length ?? 0;
                const headerCols = ['Cohort', 'Size'];
                for (let i = 0; i < periodCount; i++) {
                  headerCols.push(`${prefix}${i} %`);
                }
                const rows = retention.cohorts.map((c) => {
                  const cells = [c.label, String(c.size)];
                  for (let i = 0; i < periodCount; i++) {
                    const pct =
                      c.rates[i] != null
                        ? (c.rates[i] * 100).toFixed(1)
                        : '';
                    cells.push(pct);
                  }
                  return cells;
                });
                const escape = (s: string) =>
                  /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                const csv =
                  headerCols.map(escape).join(',') +
                  '\n' +
                  rows.map((r) => r.map(escape).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `retention-cohorts-${retention.granularity}-${retention.activeDefinition ?? 'session'}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!retention?.cohorts?.length || retentionLoading}
              className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
        {retentionLoading && <p className="text-white/60">Loading…</p>}
        {retentionError && <p className="text-red-400">{retentionError}</p>}
        {!retentionLoading && !retentionError && retention?.enabled === false && (
          <p className="text-white/60">
            Firebase not configured. Set <code className="rounded bg-white/10 px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code> and
            ensure the service account has Cloud Datastore User to read <code className="rounded bg-white/10 px-1">user_activity_logs</code>.
          </p>
        )}
        {!retentionLoading && !retentionError && retention?.enabled !== false && retention?.cohorts && (
          <div className="space-y-4">
            {retention.warnings && retention.warnings.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {retention.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            {retention.kpis && retention.kpis.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {retention.kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg border border-white/10 bg-black/30 px-4 py-2"
                  >
                    <span className="text-xs text-white/50">{kpi.label}</span>
                    <span className="ml-2 text-lg font-semibold text-white/90">
                      {Math.round(kpi.rate * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {retention.cohorts.length === 0 ? (
              <p className="text-white/60">No activity logs in range. Ensure hub logging is enabled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead className="bg-black/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-white/80">Cohort</th>
                      <th className="px-3 py-2 text-right text-white/80">Size</th>
                      {retention.cohorts[0]?.retained.map((_, i) => (
                        <th key={i} className="px-2 py-2 text-center text-white/80">
                          {retention.granularity === 'day' ? `D${i}` : `W${i}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {retention.cohorts.map((row) => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 text-white/80">{row.label}</td>
                        <td className="px-3 py-2 text-right text-white/70">
                          {row.size.toLocaleString()}
                        </td>
                        {row.rates.map((rate, i) => {
                          const pct = Math.round(rate * 100);
                          const hue = 120 * rate;
                          return (
                            <td
                              key={i}
                              className="px-2 py-2 text-center"
                              title={`${row.retained[i]} of ${row.size}`}
                              style={{
                                backgroundColor: `hsla(${hue}, 40%, 18%, 0.8)`,
                              }}
                            >
                              <span className="text-white/90">{pct}%</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monetization candidates (high-intent UIDs for outreach lookup) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">Monetization candidates</h2>
            <p className="mt-1 text-sm text-white/60">
              Firebase UIDs for high-intent, pre-paid users. Look up names in your admin app.{' '}
              <span className="text-white/50">
                Total active = distinct calendar days with any hub activity log in the last{' '}
                {candidates?.totalActiveLookbackDays ?? 365} days (not login sessions).
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Segment:</span>
              <select
                value={candidatesSegment}
                onChange={(e) => setCandidatesSegment(e.target.value as 'new' | 'return')}
                disabled={candidatesLoading}
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="new">New signups (power users)</option>
                <option value="return">Return / reactivation</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!candidates?.candidates?.length || candidatesLoading) return;
                const headerCols = [
                  'Name',
                  'UID',
                  'Signup age (days)',
                  'Last active',
                  'Total active (days)',
                  'Reasons',
                  'Workout events',
                  'Segment distinct days',
                ];
                const rows = candidates.candidates.map((c) => [
                  c.displayName ?? '',
                  c.uid,
                  String(c.signupAgeDays),
                  c.lastActivityAt ? new Date(c.lastActivityAt).toISOString().slice(0, 10) : '',
                  String(c.signals.totalActiveDays ?? 0),
                  c.reasons.join('; '),
                  String(c.signals.workoutEvents),
                  String(c.signals.distinctDays),
                ]);
                const escape = (s: string) =>
                  /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                const csv =
                  headerCols.map(escape).join(',') +
                  '\n' +
                  rows.map((r) => r.map(escape).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `monetization-candidates-${candidates.segment}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!candidates?.candidates?.length || candidatesLoading}
              className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
        {candidatesLoading && <p className="text-white/60">Loading…</p>}
        {candidatesError && <p className="text-red-400">{candidatesError}</p>}
        {!candidatesLoading && !candidatesError && candidates?.enabled === false && (
          <p className="text-white/60">
            Firebase not configured. Set <code className="rounded bg-white/10 px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code> to enable.
          </p>
        )}
        {!candidatesLoading && !candidatesError && candidates?.enabled !== false && (
          <div className="space-y-4">
            {candidates?.warnings && candidates.warnings.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {candidates.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            {!candidates?.candidates?.length ? (
              <p className="text-white/60">No candidates in range. Ensure hub activity logging is enabled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead className="bg-black/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-white/80">Name</th>
                      <th className="px-3 py-2 text-left text-white/80">UID</th>
                      <th className="px-3 py-2 text-right text-white/80">Signup age</th>
                      <th className="px-3 py-2 text-right text-white/80">Last active</th>
                      <th
                        className="px-3 py-2 text-right text-white/80"
                        title="Distinct calendar days with any activity log (lookback window), not logins"
                      >
                        Total active
                      </th>
                      <th className="px-3 py-2 text-right text-white/80">Workout</th>
                      <th
                        className="px-3 py-2 text-right text-white/80"
                        title="Distinct days with any activity in the segment window (new/return), not total lookback"
                      >
                        Seg. days
                      </th>
                      <th className="px-3 py-2 text-left text-white/80">Reasons</th>
                      <th className="px-2 py-2 text-center text-white/80">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {candidates.candidates.map((row) => (
                      <tr key={row.uid}>
                        <td className="px-3 py-2 text-white/80">
                          {row.displayName ?? '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-white/80" title={row.uid}>
                          {row.uid.length > 20 ? row.uid.slice(0, 20) + '…' : row.uid}
                        </td>
                        <td className="px-3 py-2 text-right text-white/70">{row.signupAgeDays}d</td>
                        <td className="px-3 py-2 text-right text-white/70">
                          {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-white/70">
                          {row.signals.totalActiveDays ?? 0}
                        </td>
                        <td className="px-3 py-2 text-right text-white/70">{row.signals.workoutEvents}</td>
                        <td className="px-3 py-2 text-right text-white/70">{row.signals.distinctDays}</td>
                        <td className="px-3 py-2 text-white/70">
                          <span className="flex flex-wrap gap-1">
                            {row.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="rounded bg-white/10 px-1.5 py-0.5 text-xs"
                              >
                                {r}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(row.uid);
                            }}
                            className="rounded border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                          >
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monetization drop-off (Hub Stripe funnel; analytics_funnel_events app_id=hub) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-2 font-heading text-xl font-bold">Monetization drop-off</h2>
        <p className="mb-4 text-sm text-white/60">
          Hub checkout funnel (distinct <code className="rounded bg-white/10 px-1">session_id</code>{' '}
          = purchase flow). Separate from paid/trial KPIs below (programs / Supabase profiles).
        </p>
        {monetizationDropOffLoading && <p className="text-white/60">Loading…</p>}
        {monetizationDropOffError && <p className="text-red-400">{monetizationDropOffError}</p>}
        {!monetizationDropOffLoading &&
          !monetizationDropOffError &&
          monetizationDropOff &&
          monetizationDropOff.length > 0 && (
            <div className="overflow-hidden rounded border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-black/30">
                  <tr>
                    <th className="px-3 py-2 text-left text-white/80">Step</th>
                    <th className="px-3 py-2 text-right text-white/80">Completed</th>
                    <th className="px-3 py-2 text-right text-white/80">Dropped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {monetizationDropOff.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-white/80">{row.step}</td>
                      <td className="px-3 py-2 text-right text-white/70">
                        {row.completed.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-white/70">
                        {row.dropped.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {!monetizationDropOffLoading &&
          !monetizationDropOffError &&
          (!monetizationDropOff || monetizationDropOff.length === 0) && (
            <p className="text-white/60">No funnel data in range.</p>
          )}
      </div>

      {/* Monetization (Phase 5) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 font-heading text-xl font-bold">Monetization</h2>
        {monetizationLoading && <p className="text-white/60">Loading…</p>}
        {monetizationError && <p className="text-red-400">{monetizationError}</p>}
        {!monetizationLoading && !monetizationError && monetization && (
          <div className="space-y-8">
            {/* KPI cards */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Summary</h3>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Active paid</p>
                  <p className="text-xl font-semibold">
                    {monetization.activePaidCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Active trial</p>
                  <p className="text-xl font-semibold">
                    {monetization.activeTrialCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Trial conversion</p>
                  <p className="text-xl font-semibold">
                    {monetization.trialEligible > 0
                      ? `${(monetization.trialConversionRate * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Est. MRR</p>
                  <p className="text-xl font-semibold">${monetization.estimatedMrr.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">ARPU</p>
                  <p className="text-xl font-semibold">${monetization.arpu.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">LTV heuristic</p>
                  <p className="text-xl font-semibold">${monetization.ltvHeuristic.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Plan mix */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Paid users by plan</h3>
              <div className="overflow-hidden rounded border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-black/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-white/80">Plan</th>
                      <th className="px-3 py-2 text-right text-white/80">Count</th>
                      <th className="px-3 py-2 text-right text-white/80">Price</th>
                      <th className="px-3 py-2 text-right text-white/80">Est. MRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {monetization.activeByPlan.map((row) => (
                      <tr key={row.planIndex}>
                        <td className="px-3 py-2 text-white/80">{row.planName}</td>
                        <td className="px-3 py-2 text-right text-white/70">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-white/70">
                          ${row.price.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/70">
                          ${(row.count * row.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Time to convert (TTFC) */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Time to convert (TTFC)</h3>
              <div className="overflow-hidden rounded border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-black/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-white/80">Bucket</th>
                      <th className="px-3 py-2 text-right text-white/80">Users</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="px-3 py-2 text-white/80">Same day</td>
                      <td className="px-3 py-2 text-right text-white/70">
                        {monetization.ttfcDistribution.sameDay.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-white/80">1–2 days</td>
                      <td className="px-3 py-2 text-right text-white/70">
                        {monetization.ttfcDistribution.oneToTwoDays.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-white/80">3–7 days</td>
                      <td className="px-3 py-2 text-right text-white/70">
                        {monetization.ttfcDistribution.threeToSevenDays.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-white/80">7+ days</td>
                      <td className="px-3 py-2 text-right text-white/70">
                        {monetization.ttfcDistribution.sevenPlusDays.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {!monetizationLoading && !monetizationError && !monetization && (
          <p className="text-white/60">No monetization data</p>
        )}
      </div>

      {/* Quality & reliability (Phase 6) */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-4 font-heading text-xl font-bold">Quality & reliability</h2>
        {qualityLoading && <p className="text-white/60">Loading…</p>}
        {qualityError && <p className="text-red-400">{qualityError}</p>}
        {!qualityLoading && !qualityError && quality && quality.totalErrors === 0 && (
          <p className="text-white/60">No frontend errors in range</p>
        )}
        {!qualityLoading && !qualityError && quality && quality.totalErrors > 0 && (
          <div className="space-y-8">
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">Summary</h3>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Total errors</p>
                  <p className="text-xl font-semibold">{quality.totalErrors.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs text-white/50">Top page</p>
                  <p className="text-xl font-semibold">
                    {quality.errorsByPage.length > 0
                      ? quality.errorsByPage[0].page || 'Unknown'
                      : '—'}
                  </p>
                  {quality.errorsByPage.length > 0 && (
                    <p className="text-xs text-white/50">
                      {quality.errorsByPage[0].count.toLocaleString()} errors
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Errors by page</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Page</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {quality.errorsByPage.map((row, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-xs text-white/80">
                            {row.page || 'Unknown'}
                          </td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {row.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Top errors</h3>
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Message</th>
                        <th className="px-3 py-2 text-right text-white/80">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {quality.topErrors.map((row, i) => (
                        <tr key={i}>
                          <td
                            className="px-3 py-2 font-mono text-xs text-white/80"
                            title={row.message}
                          >
                            {truncateUrl(row.message, 60)}
                          </td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {row.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {quality.errorsByDay.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-white/70">Errors over time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={quality.errorsByDay}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                      />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        name="Errors"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
        {!qualityLoading && !qualityError && !quality && (
          <p className="text-white/60">No quality data</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;
