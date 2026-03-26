import React, { useEffect, useState } from 'react';

import type { MonetizationDropOffRow } from './types';

const MonetizationDropoffDetailPanel: React.FC = () => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<MonetizationDropOffRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonetizationDropOff = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/analytics/monetization-dropoff?days=${days}`, {
          credentials: 'include',
        });
        const data = (await res.json()) as
          | { monetizationDropOff: MonetizationDropOffRow[] }
          | { error?: string };
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? 'Failed to load');
        }
        setRows((data as { monetizationDropOff: MonetizationDropOffRow[] }).monetizationDropOff ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load monetization drop-off');
        setRows(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMonetizationDropOff();
  }, [days]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold">Monetization drop-off</h2>
          <p className="mt-1 text-sm text-white/60">
            Hub checkout funnel by distinct purchase flow session.
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

      {loading && <p className="text-white/60">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && rows && rows.length > 0 && (
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
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-white/80">{row.step}</td>
                  <td className="px-3 py-2 text-right text-white/70">{row.completed.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-white/70">{row.dropped.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && (!rows || rows.length === 0) && (
        <p className="text-white/60">No funnel data in range.</p>
      )}
    </div>
  );
};

export default MonetizationDropoffDetailPanel;
