import React, { useEffect, useState } from 'react';

import type { RetentionCohortsStats } from './types';

const RetentionCohortsDetailPanel: React.FC = () => {
  const [retention, setRetention] = useState<RetentionCohortsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionGranularity, setRetentionGranularity] = useState<'week' | 'day'>('week');
  const [retentionActiveDefinition, setRetentionActiveDefinition] = useState<'session' | 'workout'>(
    'session'
  );

  useEffect(() => {
    const fetchRetention = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseParams =
          retentionGranularity === 'week'
            ? 'cohortWeeks=12&periods=13&granularity=week'
            : 'cohortDays=30&periods=31&granularity=day';
        const params = `${baseParams}&activeDefinition=${retentionActiveDefinition}`;
        const res = await fetch(`/api/admin/analytics/retention-cohorts?${params}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as RetentionCohortsStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setRetention(data as RetentionCohortsStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load retention cohort stats');
        setRetention(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRetention();
  }, [retentionGranularity, retentionActiveDefinition]);

  return (
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
              onChange={(e) => setRetentionActiveDefinition(e.target.value as 'session' | 'workout')}
              disabled={loading}
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
              disabled={loading}
              className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="text-white/60">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && retention?.enabled === false && (
        <p className="text-white/60">
          Firebase not configured. Set{' '}
          <code className="rounded bg-white/10 px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code>.
        </p>
      )}
      {!loading && !error && retention?.enabled !== false && retention?.cohorts && (
        <div className="space-y-4">
          {retention.warnings && retention.warnings.length > 0 && (
            <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              {retention.warnings.map((warning, i) => (
                <p key={i}>{warning}</p>
              ))}
            </div>
          )}
          {retention.kpis && retention.kpis.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {retention.kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-white/10 bg-black/30 px-4 py-2">
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
                      <td className="px-3 py-2 text-right text-white/70">{row.size.toLocaleString()}</td>
                      {row.rates.map((rate, i) => {
                        const pct = Math.round(rate * 100);
                        const hue = 120 * rate;
                        return (
                          <td
                            key={i}
                            className="px-2 py-2 text-center"
                            title={`${row.retained[i]} of ${row.size}`}
                            style={{ backgroundColor: `hsla(${hue}, 40%, 18%, 0.8)` }}
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
  );
};

export default RetentionCohortsDetailPanel;
