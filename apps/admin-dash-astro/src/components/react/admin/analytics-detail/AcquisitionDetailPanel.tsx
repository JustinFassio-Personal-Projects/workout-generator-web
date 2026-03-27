import React, { useEffect, useState } from 'react';

import { adminFetch } from '@/lib/supabase/client/admin-fetch';

import type { AcquisitionStats } from './types';

const AcquisitionDetailPanel: React.FC = () => {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<AcquisitionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAcquisition = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await adminFetch(`/api/admin/analytics/acquisition?days=${days}`);
        const data = (await res.json()) as AcquisitionStats | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load acquisition stats');
        }
        setStats(data as AcquisitionStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load acquisition stats');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAcquisition();
  }, [days]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold">Acquisition & traffic</h2>
          <p className="mt-1 text-sm text-white/60">UTM and landing-page signals feeding messaging experiments.</p>
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
      {loading && <p className="text-white/60">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && stats && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-3 py-2 text-left text-white/80">Top landing pages</th>
                  <th className="px-3 py-2 text-right text-white/80">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.topLandingPages.slice(0, 10).map((row) => (
                  <tr key={row.path}>
                    <td className="px-3 py-2 text-white/80">{row.path}</td>
                    <td className="px-3 py-2 text-right text-white/70">{row.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-3 py-2 text-left text-white/80">Source</th>
                  <th className="px-3 py-2 text-left text-white/80">Medium</th>
                  <th className="px-3 py-2 text-left text-white/80">Campaign</th>
                  <th className="px-3 py-2 text-right text-white/80">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.utmBreakdown.slice(0, 10).map((row) => (
                  <tr key={`${row.source}-${row.medium}-${row.campaign}`}>
                    <td className="px-3 py-2 text-white/80">{row.source || '—'}</td>
                    <td className="px-3 py-2 text-white/70">{row.medium || '—'}</td>
                    <td className="px-3 py-2 text-white/70">{row.campaign || '—'}</td>
                    <td className="px-3 py-2 text-right text-white/70">{row.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && !error && !stats && <p className="text-white/60">No acquisition data in range.</p>}
    </div>
  );
};

export default AcquisitionDetailPanel;
