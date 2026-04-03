/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin home: hub users with recent activity (see LIVE_HUB_USERS_DASHBOARD_CARD_TDD.md).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { adminFetch } from '@/lib/supabase/client/admin-fetch';
import { adminPaths } from '@/lib/admin/config';

type LiveSource = 'activity' | 'presence';

type LiveRecentAction = { action: string; timestamp: string; log_id: string };

type LiveHubUserJson = {
  user_id: string;
  display_name: string | null;
  last_seen: string;
  recent_actions: LiveRecentAction[];
  session_id: string | null;
};

type LiveHubUsersResponse = {
  configured: boolean;
  source?: LiveSource;
  /** `rolling` for heartbeat or legacy short activity window; `pacific_day` for activity (default). */
  windowMode?: 'rolling' | 'pacific_day';
  windowMinutes: number | null;
  windowTimezone?: string;
  windowStart?: string | null;
  generatedAt: string;
  distinctUserCount: number;
  users: LiveHubUserJson[];
  scanLimit?: number;
  note?: string;
  error?: string;
  hint?: string;
  details?: string;
};

function defaultSourceFromEnv(): LiveSource {
  const raw = import.meta.env.PUBLIC_ADMIN_LIVE_USERS_SOURCE;
  return raw === 'presence' ? 'presence' : 'activity';
}

function shortId(value: string | null, head = 8): string {
  if (!value) return '—';
  if (value.length <= head + 2) return value;
  return `${value.slice(0, head)}…`;
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const error = typeof data.error === 'string' ? data.error : fallback;
  const hint = typeof data.hint === 'string' ? data.hint : undefined;
  const details = typeof data.details === 'string' ? data.details : undefined;
  return [error, hint, details].filter(Boolean).join('\n\n');
}

function formatSeen(iso: string): string {
  try {
    return iso.replace('T', ' ').slice(0, 19);
  } catch {
    return iso;
  }
}

const LiveHubUsersCard: React.FC = () => {
  const [source, setSource] = useState<LiveSource>(defaultSourceFromEnv);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LiveHubUsersResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({ limit: '25', source });
      if (source === 'presence') {
        q.set('minutes', '5');
      } else {
        q.set('window', 'pacific_day');
      }
      const res = await adminFetch(`/api/admin/hub/live-users?${q.toString()}`);
      const text = await res.text();
      let json: Record<string, unknown> = {};
      if (text) {
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {
          // Non-JSON body (e.g. proxy error page) — still surface status via apiErrorMessage
        }
      }
      if (!res.ok) {
        throw new Error(apiErrorMessage(json, 'Failed to load'));
      }
      setData(json as unknown as LiveHubUsersResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    void load();
  }, [load]);

  const rollingMinutes =
    typeof data?.windowMinutes === 'number' ? data.windowMinutes : 5;
  const effectiveSource: LiveSource = data?.source ?? source;
  const isPresence = effectiveSource === 'presence';
  const activityIsRolling = !isPresence && data?.windowMode === 'rolling';

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Live</h3>
          <p className="text-xs text-white/55">
            {isPresence ? (
              <>
                Heartbeat in the last {rollingMinutes} minute{rollingMinutes === 1 ? '' : 's'}{' '}
                (hub <code className="text-[11px] text-white/50">user_presence</code>)
              </>
            ) : activityIsRolling ? (
              <>
                Active in the last {rollingMinutes} minute{rollingMinutes === 1 ? '' : 's'} (hub
                activity logs)
              </>
            ) : (
              <>
                Activity from midnight Pacific (PT) through the current minute — hub{' '}
                <code className="text-[11px] text-white/50">user_activity_logs</code>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-white/15 bg-black/30 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSource('activity')}
              className={`rounded px-2 py-1 ${
                source === 'activity' ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white/80'
              }`}
            >
              Activity
            </button>
            <button
              type="button"
              onClick={() => setSource('presence')}
              className={`rounded px-2 py-1 ${
                source === 'presence' ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white/80'
              }`}
            >
              Heartbeat
            </button>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded border border-white/20 bg-black/30 px-3 py-1 text-xs text-white/90 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-white/50">Loading…</p>}
      {error && (
        <p className="whitespace-pre-wrap text-sm text-red-400">{error}</p>
      )}

      {!loading && !error && data && !data.configured && (
        <p className="text-sm text-white/50">Firebase is not configured for this environment.</p>
      )}

      {!loading && !error && data?.configured && data.users.length === 0 && (
        <p className="text-sm text-white/50">
          {isPresence ? 'No hub heartbeats in this window.' : 'No hub activity in this window.'}
          {data.note ? (
            <span className="mt-1 block text-xs text-white/40">{data.note}</span>
          ) : null}
        </p>
      )}

      {!loading && !error && data?.configured && data.users.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/50">
            <span className="font-medium text-white/70">{data.distinctUserCount}</span> distinct
            user{data.distinctUserCount === 1 ? '' : 's'} in sample
            {data.note ? (
              <span className="mt-1 block text-[11px] text-white/40">{data.note}</span>
            ) : null}
          </p>
          <div className="overflow-x-auto rounded border border-white/10">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-2 py-2 text-left text-white/70">Name</th>
                  <th className="px-2 py-2 text-left text-white/70">User</th>
                  <th className="px-2 py-2 text-left text-white/70">Last seen (UTC)</th>
                  {!isPresence && (
                    <th className="px-2 py-2 text-left text-white/70">Recent actions</th>
                  )}
                  <th className="px-2 py-2 text-left text-white/70">Session</th>
                  <th className="px-2 py-2 text-right text-white/70"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.users.map((u) => (
                  <tr key={u.user_id} className="text-white/80">
                    <td className="max-w-[140px] truncate px-2 py-1.5" title={u.display_name ?? ''}>
                      {u.display_name?.trim() ? u.display_name.trim() : '—'}
                    </td>
                    <td className="px-2 py-1.5 font-mono" title={u.user_id}>
                      {shortId(u.user_id)}
                    </td>
                    <td
                      className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px]"
                      title={u.last_seen}
                    >
                      {formatSeen(u.last_seen)}
                    </td>
                    {!isPresence && (
                      <td className="px-2 py-1.5 align-top">
                        <ul className="list-inside list-disc space-y-0.5 text-[11px] text-white/75">
                          {u.recent_actions.map((a) => (
                            <li key={a.log_id}>
                              <span className="text-white/90">{a.action}</span>
                              <span className="text-white/45"> · {formatSeen(a.timestamp)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    )}
                    <td
                      className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[11px]"
                      title={u.session_id ?? ''}
                    >
                      {shortId(u.session_id, 10)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Link
                        to={`${adminPaths.root}/users?q=${encodeURIComponent(u.user_id)}`}
                        className="text-amber-300 hover:underline"
                      >
                        View in Users
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveHubUsersCard;
