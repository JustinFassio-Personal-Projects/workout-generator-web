import React, { useCallback, useEffect, useState } from 'react';

import { adminFetch } from '@/lib/supabase/client/admin-fetch';

type ActivityRow = {
  id: string;
  timestamp: string;
  action: string;
  user_id: string | null;
  session_id: string | null;
  resource_id: string | null;
  workout_attempt_id: string | null;
  details: Record<string, unknown>;
};

function shortId(value: string | null, head = 8): string {
  if (!value) return '—';
  if (value.length <= head + 2) return value;
  return `${value.slice(0, head)}…`;
}

function surfaceFromDetails(details: Record<string, unknown>): string {
  const s = details.surface;
  return typeof s === 'string' && s.trim() ? s : '—';
}

const WorkoutJourneyExplorer: React.FC = () => {
  const [days, setDays] = useState(7);
  const [limit] = useState(50);
  const [starts, setStarts] = useState<ActivityRow[]>([]);
  const [startsLoading, setStartsLoading] = useState(false);
  const [startsError, setStartsError] = useState<string | null>(null);

  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ActivityRow[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);

  const loadStarts = useCallback(async () => {
    try {
      setStartsLoading(true);
      setStartsError(null);
      const res = await adminFetch(
        `/api/admin/analytics/workout-journey?list_starts=true&days=${days}&limit=${limit}`
      );
      const data = (await res.json()) as
        | { starts?: ActivityRow[]; error?: string }
        | Record<string, unknown>;
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? 'Failed to load');
      }
      setStarts(((data as { starts?: ActivityRow[] }).starts ?? []) as ActivityRow[]);
    } catch (err) {
      setStartsError(err instanceof Error ? err.message : 'Failed to load recent starts');
      setStarts([]);
    } finally {
      setStartsLoading(false);
    }
  }, [days, limit]);

  useEffect(() => {
    void loadStarts();
  }, [loadStarts]);

  const loadJourney = async (attemptId: string) => {
    try {
      setJourneyLoading(true);
      setJourneyError(null);
      setSelectedAttemptId(attemptId);
      const res = await adminFetch(
        `/api/admin/analytics/workout-journey?workout_attempt_id=${encodeURIComponent(attemptId)}`
      );
      const data = (await res.json()) as {
        steps?: ActivityRow[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to load journey');
      }
      setSteps(data.steps ?? []);
    } catch (err) {
      setJourneyError(err instanceof Error ? err.message : 'Failed to load journey');
      setSteps([]);
    } finally {
      setJourneyLoading(false);
    }
  };

  return (
    <div
      id="workout-journey-explorer"
      className="scroll-mt-8 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-white/80">Workout journey explorer</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
            aria-label="Days lookback for recent starts"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={() => void loadStarts()}
            disabled={startsLoading}
            className="rounded border border-white/20 bg-black/30 px-3 py-1 text-xs text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            Refresh list
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-white/55">
        Recent <code className="rounded bg-black/30 px-1">workout:start</code>{' '}
        events that include a{' '}
        <code className="rounded bg-black/30 px-1">workout_attempt_id</code>. Choose{' '}
        <span className="text-white/75">View journey</span> to see ordered open → start → complete (and
        other) rows for that attempt.
      </p>

      {startsLoading && <p className="text-sm text-white/50">Loading recent starts…</p>}
      {startsError && <p className="text-sm text-red-400">{startsError}</p>}

      {!startsLoading && !startsError && starts.length === 0 && (
        <div className="space-y-2 text-sm text-white/50">
          <p>No recent workout starts in this window.</p>
          <p className="text-xs leading-relaxed text-white/40">
            The list only includes{' '}
            <code className="rounded bg-black/30 px-1">workout:start</code> rows with a top-level{' '}
            <code className="rounded bg-black/30 px-1">workout_attempt_id</code> (current hub clients). If
            counts stay at zero, confirm users are on a build that logs starts from all three players and
            that Firestore composite indexes are deployed (
            <span className="text-white/50">see FIRESTORE_INDEXES_RETENTION.md</span>
            ).
          </p>
        </div>
      )}

      {starts.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded border border-white/10">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-black/30">
              <tr>
                <th className="px-2 py-2 text-left text-white/70">Time (UTC)</th>
                <th className="px-2 py-2 text-left text-white/70">User</th>
                <th className="px-2 py-2 text-left text-white/70">Workout</th>
                <th className="px-2 py-2 text-left text-white/70">Surface</th>
                <th className="px-2 py-2 text-left text-white/70">Attempt id</th>
                <th className="px-2 py-2 text-right text-white/70"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {starts.map((row) => {
                const aid = row.workout_attempt_id ?? '';
                return (
                  <tr key={row.id} className="text-white/80">
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px]">
                      {row.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-2 py-1.5 font-mono" title={row.user_id ?? ''}>
                      {shortId(row.user_id)}
                    </td>
                    <td className="px-2 py-1.5 font-mono" title={row.resource_id ?? ''}>
                      {shortId(row.resource_id)}
                    </td>
                    <td className="px-2 py-1.5">{surfaceFromDetails(row.details)}</td>
                    <td className="max-w-[140px] truncate px-2 py-1.5 font-mono" title={aid}>
                      {shortId(aid || null, 12)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {aid ? (
                        <button
                          type="button"
                          onClick={() => void loadJourney(aid)}
                          className="text-amber-300 hover:underline"
                        >
                          View journey
                        </button>
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(selectedAttemptId || journeyLoading || journeyError || steps.length > 0) && (
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <h4 className="mb-2 text-xs font-medium text-white/70">Timeline</h4>
          {selectedAttemptId && (
            <p className="mb-2 font-mono text-[11px] text-white/50">attempt: {selectedAttemptId}</p>
          )}
          {journeyLoading && <p className="text-sm text-white/50">Loading timeline…</p>}
          {journeyError && <p className="text-sm text-red-400">{journeyError}</p>}
          {!journeyLoading && !journeyError && steps.length === 0 && selectedAttemptId && (
            <p className="text-sm text-white/50">No rows found for this attempt id.</p>
          )}
          {steps.length > 0 && (
            <ol className="relative ml-0 list-none border-l border-white/15 pl-4">
              {steps.map((step) => (
                <li key={step.id} className="mb-4 ml-1">
                  <span className="absolute -left-1.5 mt-1.5 h-2 w-2 rounded-full bg-amber-400" />
                  <p className="font-mono text-[11px] text-white/45">
                    {step.timestamp.replace('T', ' ').slice(0, 19)} UTC
                  </p>
                  <p className="text-sm font-medium text-white/90">{step.action}</p>
                  <p className="text-[11px] text-white/50">
                    session {shortId(step.session_id)} · resource {shortId(step.resource_id)}
                  </p>
                  {Object.keys(step.details).length > 0 && (
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] text-white/60">
                      {JSON.stringify(step.details, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutJourneyExplorer;
