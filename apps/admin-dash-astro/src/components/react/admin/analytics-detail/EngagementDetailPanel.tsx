import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ACTIVITY_JOURNEY_EXPLORER_ELEMENT_ID,
  getDrillDownConfig,
} from '@/lib/admin/activity-drill-down-config';
import { adminFetch } from '@/lib/supabase/client/admin-fetch';

import ActivityJourneyExplorer from './ActivityJourneyExplorer';
import type { EngagementStats } from './types';

const EngagementDetailPanel: React.FC = () => {
  const [activeDrillDownEvent, setActiveDrillDownEvent] = useState('workout:start');
  const [days, setDays] = useState(30);
  const [engagement, setEngagement] = useState<EngagementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adminFetch(`/api/admin/analytics/engagement?days=${days}`);
        const data = (await res.json()) as EngagementStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setEngagement(data as EngagementStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load engagement stats');
        setEngagement(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, [days]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-bold">Engagement</h2>
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

      {loading && <p className="text-white/60">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && engagement && (
        <div className="space-y-8">
          {engagement.engagementHubWarnings && engagement.engagementHubWarnings.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {engagement.engagementHubWarnings.map((warning, i) => (
                <p key={i}>{warning}</p>
              ))}
            </div>
          )}

          {engagement.dauByDay.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-white/70">DAU over time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagement.dauByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#ffbf00" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
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

          <div>
            <h3 className="mb-2 text-sm font-medium text-white/70">Feature adoption</h3>
            {engagement.featureAdoptionHub && engagement.featureAdoptionHub.length > 0 && (
              <div className="mb-4 overflow-hidden rounded border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-black/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-white/80">Action</th>
                      <th className="px-3 py-2 text-right text-white/80">Last 7 days</th>
                      <th className="px-3 py-2 text-right text-white/80">Last 30 days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {engagement.featureAdoptionHub.map((row, i) => {
                      const drill = getDrillDownConfig(row.eventName);
                      const isDrillDown = drill?.enabled === true;
                      const scrollToActivityJourneys = () => {
                        setActiveDrillDownEvent(row.eventName);
                        document.getElementById(ACTIVITY_JOURNEY_EXPLORER_ELEMENT_ID)?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                      };
                      return (
                        <tr
                          key={i}
                          role={isDrillDown ? 'button' : undefined}
                          className={
                            isDrillDown
                              ? 'cursor-pointer hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-amber-400/40 outline-none'
                              : undefined
                          }
                          tabIndex={isDrillDown ? 0 : undefined}
                          aria-label={
                            isDrillDown
                              ? `${row.displayLabel ?? row.eventName} — scroll to activity journey explorer`
                              : undefined
                          }
                          onClick={isDrillDown ? scrollToActivityJourneys : undefined}
                          onKeyDown={
                            isDrillDown
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    scrollToActivityJourneys();
                                  }
                                }
                              : undefined
                          }
                        >
                          <td className="px-3 py-2 text-white/80">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              <span>{row.displayLabel ?? row.eventName}</span>
                              {isDrillDown && (
                                <span className="text-xs font-medium text-amber-300">
                                  {drill.browseLabel}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {row.count7d.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-white/70">
                            {row.count30d.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {engagement.featureAdoptionHub != null && (
              <div className="mt-4">
                <ActivityJourneyExplorer activeEventName={activeDrillDownEvent} />
              </div>
            )}
            {engagement.featureAdoptionMarketing && engagement.featureAdoptionMarketing.length > 0 && (
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
                        <td className="px-3 py-2 font-mono text-xs text-white/80">{row.eventName}</td>
                        <td className="px-3 py-2 text-right text-white/70">{row.count7d.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-white/70">{row.count30d.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-white/70">Power-user distribution</h3>
            {engagement.powerUserDistribution.some((bucket) => bucket.count > 0) ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagement.powerUserDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="bucket" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                    <Bar dataKey="count" fill="#ffbf00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-white/50">No power-user data in range</p>
            )}
          </div>
        </div>
      )}
      {!loading && !error && !engagement && <p className="text-white/60">No engagement data</p>}
    </div>
  );
};

export default EngagementDetailPanel;
