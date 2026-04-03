import React, { useCallback, useEffect, useState } from 'react';

import {
  ACTIVITY_JOURNEY_EXPLORER_ELEMENT_ID,
  type ActivityLogRow,
  type ActivityTimelineTarget,
  getDrillDownConfig,
  resolveRowTimelineTarget,
} from '@/lib/admin/activity-drill-down-config';
import { timelineHeadingWithPossessive } from '@/lib/admin/possessive-label';
import { adminFetch } from '@/lib/supabase/client/admin-fetch';

function shortId(value: string | null, head = 8): string {
  if (!value) return '—';
  if (value.length <= head + 2) return value;
  return `${value.slice(0, head)}…`;
}

function surfaceFromDetails(details: Record<string, unknown>): string {
  const s = details.surface;
  return typeof s === 'string' && s.trim() ? s : '—';
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const error = typeof data.error === 'string' ? data.error : fallback;
  const hint = typeof data.hint === 'string' ? data.hint : undefined;
  const details = typeof data.details === 'string' ? data.details : undefined;
  return [error, hint, details].filter(Boolean).join('\n\n');
}

function normalizeRow(raw: unknown): ActivityLogRow {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      timestamp: '',
      action: '',
      user_id: null,
      user_display_name: null,
      session_id: null,
      resource_id: null,
      workout_attempt_id: null,
      generation_id: null,
      details: {},
    };
  }
  const r = raw as Record<string, unknown>;
  const detailsRaw = r.details;
  const details =
    detailsRaw != null && typeof detailsRaw === 'object' && !Array.isArray(detailsRaw)
      ? (detailsRaw as Record<string, unknown>)
      : {};
  const rawName = r.user_display_name;
  const userDisplayName =
    typeof rawName === 'string' ? (rawName.trim() || null) : null;

  return {
    id: r.id != null ? String(r.id) : '',
    timestamp: r.timestamp != null ? String(r.timestamp) : '',
    action: r.action != null ? String(r.action) : '',
    user_id: r.user_id != null ? String(r.user_id) : null,
    user_display_name: userDisplayName,
    session_id: r.session_id != null ? String(r.session_id) : null,
    resource_id: r.resource_id != null ? String(r.resource_id) : null,
    workout_attempt_id: r.workout_attempt_id != null ? String(r.workout_attempt_id) : null,
    generation_id: r.generation_id != null ? String(r.generation_id) : null,
    details,
  };
}

async function fetchWorkoutJourneyStarts(
  days: number,
  limit: number
): Promise<ActivityLogRow[]> {
  const res = await adminFetch(
    `/api/admin/analytics/workout-journey?list_starts=true&days=${days}&limit=${limit}`
  );
  const data = (await res.json()) as Record<string, unknown> & { starts?: unknown[] };
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, 'Failed to load'));
  }
  return (data.starts ?? []).map(normalizeRow).filter((row) => row.id.length > 0);
}

async function fetchActivityJourneyList(
  action: string,
  days: number,
  limit: number
): Promise<ActivityLogRow[]> {
  const q = new URLSearchParams({
    list: '1',
    action,
    days: String(days),
    limit: String(limit),
  });
  const res = await adminFetch(`/api/admin/analytics/activity-journey?${q.toString()}`);
  const data = (await res.json()) as Record<string, unknown> & { mode?: string; rows?: unknown[] };
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, 'Failed to load'));
  }
  return (data.rows ?? []).map(normalizeRow).filter((row) => row.id.length > 0);
}

async function fetchAttemptTimeline(attemptId: string): Promise<ActivityLogRow[]> {
  const res = await adminFetch(
    `/api/admin/analytics/workout-journey?workout_attempt_id=${encodeURIComponent(attemptId)}`
  );
  const data = (await res.json()) as Record<string, unknown> & { steps?: unknown[] };
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, 'Failed to load journey'));
  }
  return (data.steps ?? []).map(normalizeRow).filter((row) => row.id.length > 0);
}

async function fetchGenerationTimeline(generationId: string): Promise<ActivityLogRow[]> {
  const q = new URLSearchParams({
    correlation: 'generation_id',
    id: generationId,
  });
  const res = await adminFetch(`/api/admin/analytics/activity-journey?${q.toString()}`);
  const data = (await res.json()) as Record<string, unknown> & { mode?: string; rows?: unknown[] };
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, 'Failed to load journey'));
  }
  return (data.rows ?? []).map(normalizeRow).filter((row) => row.id.length > 0);
}

async function fetchSessionTimeline(sessionId: string): Promise<ActivityLogRow[]> {
  const q = new URLSearchParams({
    correlation: 'session_id',
    id: sessionId,
  });
  const res = await adminFetch(`/api/admin/analytics/activity-journey?${q.toString()}`);
  const data = (await res.json()) as Record<string, unknown> & { mode?: string; rows?: unknown[] };
  if (!res.ok) {
    throw new Error(apiErrorMessage(data, 'Failed to load journey'));
  }
  return (data.rows ?? []).map(normalizeRow).filter((row) => row.id.length > 0);
}

function timelineCorrelationField(target: ActivityTimelineTarget): string {
  switch (target.kind) {
    case 'attempt':
      return 'workout_attempt_id';
    case 'generation_id':
      return 'generation_id';
    case 'session_id':
      return 'session_id';
  }
}

async function fetchTimelineRows(target: ActivityTimelineTarget): Promise<ActivityLogRow[]> {
  switch (target.kind) {
    case 'attempt':
      return fetchAttemptTimeline(target.id);
    case 'generation_id':
      return fetchGenerationTimeline(target.id);
    case 'session_id':
      return fetchSessionTimeline(target.id);
  }
}

export interface ActivityJourneyExplorerProps {
  activeEventName: string;
}

const ActivityJourneyExplorer: React.FC<ActivityJourneyExplorerProps> = ({ activeEventName }) => {
  const config = getDrillDownConfig(activeEventName);
  const enabled = config?.enabled === true ? config : null;

  const [days, setDays] = useState(7);

  const [listRows, setListRows] = useState<ActivityLogRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedTimeline, setSelectedTimeline] = useState<ActivityTimelineTarget | null>(null);
  const [timelineUserDisplayName, setTimelineUserDisplayName] = useState<string | null>(null);
  const [timelineRows, setTimelineRows] = useState<ActivityLogRow[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!enabled) return;
    const listLimit = enabled.defaultListLimit;
    try {
      setListLoading(true);
      setListError(null);
      let rows: ActivityLogRow[];
      if (enabled.list.type === 'workout_journey_starts') {
        rows = await fetchWorkoutJourneyStarts(days, listLimit);
      } else {
        rows = await fetchActivityJourneyList(enabled.list.action, days, listLimit);
      }
      setListRows(rows);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load list');
      setListRows([]);
    } finally {
      setListLoading(false);
    }
  }, [enabled, days]);

  useEffect(() => {
    setSelectedTimeline(null);
    setTimelineUserDisplayName(null);
    setTimelineRows([]);
    setTimelineError(null);
  }, [activeEventName]);

  useEffect(() => {
    if (enabled) {
      void loadList();
    }
  }, [enabled, loadList]);

  const loadTimeline = async (
    target: ActivityTimelineTarget,
    listRowUserDisplayName?: string | null
  ) => {
    if (!enabled) return;
    try {
      setTimelineLoading(true);
      setTimelineError(null);
      setSelectedTimeline(target);
      const trimmed =
        typeof listRowUserDisplayName === 'string' ? listRowUserDisplayName.trim() : '';
      setTimelineUserDisplayName(trimmed || null);
      const rows = await fetchTimelineRows(target);
      setTimelineRows(rows);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : 'Failed to load journey');
      setTimelineRows([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  if (!enabled) {
    return (
      <div
        id={ACTIVITY_JOURNEY_EXPLORER_ELEMENT_ID}
        className="scroll-mt-8 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
      >
        <p className="text-sm text-white/50">No activity journey drill-down for this action.</p>
      </div>
    );
  }

  const showTimelinePanel = enabled.timeline.type !== 'none';

  return (
    <div
      id={ACTIVITY_JOURNEY_EXPLORER_ELEMENT_ID}
      className="scroll-mt-8 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-white/80">{enabled.explorerTitle}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
            aria-label="Days lookback for recent list"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={listLoading}
            className="rounded border border-white/20 bg-black/30 px-3 py-1 text-xs text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            Refresh list
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-white/55">{enabled.listDescription}</p>

      {listLoading && <p className="text-sm text-white/50">Loading list…</p>}
      {listError && (
        <p className="whitespace-pre-wrap text-sm text-red-400">{listError}</p>
      )}

      {!listLoading && !listError && listRows.length === 0 && (
        <div className="space-y-2 text-sm text-white/50">
          <p>No recent rows in this window.</p>
          <p className="text-xs leading-relaxed text-white/40">{enabled.emptyHint}</p>
        </div>
      )}

      {listRows.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded border border-white/10">
          <table className="w-full min-w-[520px] text-xs">
            <thead className="bg-black/30">
              <tr>
                <th className="px-2 py-2 text-left text-white/70">Time (UTC)</th>
                <th className="px-2 py-2 text-left text-white/70">User</th>
                {enabled.showUserDisplayNameColumn && (
                  <th className="px-2 py-2 text-left text-white/70">Name</th>
                )}
                <th className="px-2 py-2 text-left text-white/70">Resource</th>
                {enabled.showSurfaceColumn && (
                  <th className="px-2 py-2 text-left text-white/70">Surface</th>
                )}
                {enabled.showGenerationIdColumn && (
                  <th className="px-2 py-2 text-left text-white/70">Generation id</th>
                )}
                {enabled.showAttemptIdColumn && (
                  <th className="px-2 py-2 text-left text-white/70">Attempt id</th>
                )}
                {enabled.showSessionIdColumn && (
                  <th className="px-2 py-2 text-left text-white/70">Session id</th>
                )}
                <th className="px-2 py-2 text-right text-white/70"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {listRows.map((row) => {
                const timelineTarget = resolveRowTimelineTarget(enabled, row);
                const attemptShort = shortId(row.workout_attempt_id, 12);
                const genShort = shortId(row.generation_id, 12);
                const sessShort = shortId(row.session_id, 12);
                return (
                  <tr key={row.id} className="text-white/80">
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px]">
                      {row.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-2 py-1.5 font-mono" title={row.user_id ?? ''}>
                      {shortId(row.user_id)}
                    </td>
                    {enabled.showUserDisplayNameColumn && (
                      <td
                        className="max-w-[160px] truncate px-2 py-1.5 text-white/85"
                        title={row.user_display_name ?? ''}
                      >
                        {row.user_display_name?.trim() ? row.user_display_name.trim() : '—'}
                      </td>
                    )}
                    <td className="px-2 py-1.5 font-mono" title={row.resource_id ?? ''}>
                      {shortId(row.resource_id)}
                    </td>
                    {enabled.showSurfaceColumn && (
                      <td className="px-2 py-1.5">{surfaceFromDetails(row.details)}</td>
                    )}
                    {enabled.showGenerationIdColumn && (
                      <td
                        className="max-w-[140px] truncate px-2 py-1.5 font-mono"
                        title={row.generation_id ?? ''}
                      >
                        {genShort}
                      </td>
                    )}
                    {enabled.showAttemptIdColumn && (
                      <td
                        className="max-w-[140px] truncate px-2 py-1.5 font-mono"
                        title={row.workout_attempt_id ?? ''}
                      >
                        {attemptShort}
                      </td>
                    )}
                    {enabled.showSessionIdColumn && (
                      <td
                        className="max-w-[140px] truncate px-2 py-1.5 font-mono"
                        title={row.session_id ?? ''}
                      >
                        {sessShort}
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-right">
                      {timelineTarget ? (
                        <button
                          type="button"
                          onClick={() =>
                            void loadTimeline(timelineTarget, row.user_display_name ?? null)
                          }
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

      {showTimelinePanel &&
        (selectedTimeline || timelineLoading || timelineError || timelineRows.length > 0) && (
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <h4 className="mb-2 text-xs font-medium text-white/70">
            {timelineHeadingWithPossessive(timelineUserDisplayName)}
          </h4>
          {selectedTimeline && (
            <p className="mb-2 font-mono text-[11px] text-white/50">
              {timelineCorrelationField(selectedTimeline)}: {selectedTimeline.id}
            </p>
          )}
          {timelineLoading && <p className="text-sm text-white/50">Loading timeline…</p>}
          {timelineError && (
            <p className="whitespace-pre-wrap text-sm text-red-400">{timelineError}</p>
          )}
          {!timelineLoading &&
            !timelineError &&
            timelineRows.length === 0 &&
            selectedTimeline && (
            <p className="text-sm text-white/50">No rows found for this id.</p>
          )}
          {timelineRows.length > 0 && (
            <ol className="relative ml-0 list-none border-l border-white/15 pl-4">
              {timelineRows.map((step) => (
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

export default ActivityJourneyExplorer;
