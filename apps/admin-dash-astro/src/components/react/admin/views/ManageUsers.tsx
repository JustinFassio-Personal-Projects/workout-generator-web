/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, LogOut, RefreshCw } from 'lucide-react';
import type {
  AdminUsersTabId,
  FirestoreHubUser,
  MergedAdminUserRow,
  UserProfile,
} from '@/types/admin-users';
import { ADMIN_STATS_TIMEZONE } from '@/lib/admin/adminStatsTimezone';
import { computeSignupQuickStats, type SignupQuickStats } from '@/lib/admin/signupQuickStats';

const PROVIDER_LABELS: Record<string, string> = {
  'google.com': 'Google',
  password: 'Email',
  'facebook.com': 'Facebook',
  'apple.com': 'Apple',
  'github.com': 'GitHub',
};

function formatProviderIds(providerIds?: string[]): string {
  if (!providerIds || providerIds.length === 0) return '—';
  return providerIds.map((id) => PROVIDER_LABELS[id] ?? id).join(', ');
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: ADMIN_STATS_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function purchasedLabel(purchasedIndex: number | null | undefined): string {
  if (purchasedIndex !== null && purchasedIndex !== undefined) return `Program ${purchasedIndex}`;
  return 'None';
}

function formatDeltaPct(pct: number | null): string {
  if (pct === null) return '—';
  const rounded = Math.round(pct * 10) / 10;
  const body = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  return `${pct > 0 ? '+' : ''}${body}%`;
}

function formatHubSnapshotAt(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: ADMIN_STATS_TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

type HubDashboardJson = {
  configured: boolean;
  generatedAt: string | null;
  quickStats: SignupQuickStats | null;
  users: FirestoreHubUser[];
  totalUsers: number;
  nextOffset: number | null;
  excludedFromStatsCount: number;
};

/** All-tab merge is not deduped; Hub slice is first page only (see fetch when tab=all). */
function buildMergedRows(supabase: UserProfile[], hub: FirestoreHubUser[]): MergedAdminUserRow[] {
  const rows: MergedAdminUserRow[] = [
    ...supabase.map((profile) => ({ source: 'supabase' as const, profile })),
    ...hub.map((profile) => ({ source: 'firestore' as const, profile })),
  ];

  const createdMs = (row: MergedAdminUserRow): number | null => {
    if (row.source === 'supabase') {
      const ms = Date.parse(row.profile.createdAt);
      return Number.isFinite(ms) ? ms : null;
    }
    if (!row.profile.createdAt) return null;
    const ms = Date.parse(row.profile.createdAt);
    return Number.isFinite(ms) ? ms : null;
  };

  rows.sort((a, b) => {
    const ta = createdMs(a);
    const tb = createdMs(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });
  return rows;
}

const TAB_CLASS =
  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors border border-transparent';
const TAB_ACTIVE = 'bg-[#ffbf00]/20 text-[#ffbf00] border-[#ffbf00]/30';
const TAB_INACTIVE = 'text-white/60 hover:bg-white/5 hover:text-white';

/** Newest signups first; missing/invalid dates sort last. */
function compareSignupDesc(
  aCreated: string | null | undefined,
  bCreated: string | null | undefined
): number {
  const ma = aCreated ? Date.parse(aCreated) : Number.NaN;
  const mb = bCreated ? Date.parse(bCreated) : Number.NaN;
  const fa = Number.isFinite(ma);
  const fb = Number.isFinite(mb);
  if (!fa && !fb) return 0;
  if (!fa) return 1;
  if (!fb) return -1;
  return mb - ma;
}

/** Scroll horizontally on narrow viewports; wide tables keep a readable minimum width. */
const TABLE_SCROLL_CLASS =
  'min-w-0 overflow-x-auto rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm [-webkit-overflow-scrolling:touch]';
const TABLE_INNER_CLASS = 'w-full min-w-[720px]';
const TABLE_INNER_WIDE_CLASS = 'w-full min-w-[960px]';

const ManageUsers: React.FC = () => {
  const [tab, setTab] = useState<AdminUsersTabId>('supabase');

  const [supabaseUsers, setSupabaseUsers] = useState<UserProfile[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(true);

  const [firestoreStatus, setFirestoreStatus] = useState<'loading' | 'ready'>('loading');
  const [firestoreUsers, setFirestoreUsers] = useState<FirestoreHubUser[]>([]);
  const [firestoreNextOffset, setFirestoreNextOffset] = useState<number | null>(null);
  const [firestoreTotalUsers, setFirestoreTotalUsers] = useState(0);
  const [firestoreConfigured, setFirestoreConfigured] = useState<boolean | null>(null);
  const [firestorePageLoading, setFirestorePageLoading] = useState(false);

  const [mergeHubUsers, setMergeHubUsers] = useState<FirestoreHubUser[]>([]);
  const [mergeHubConfigured, setMergeHubConfigured] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [revokingUid, setRevokingUid] = useState<string | null>(null);

  /** First Hub dashboard request (stats + first page of users, one Firestore snapshot). */
  const [hubBootstrapLoading, setHubBootstrapLoading] = useState(true);
  const [hubStatsConfigured, setHubStatsConfigured] = useState<boolean | null>(null);
  const [hubQuickStats, setHubQuickStats] = useState<SignupQuickStats | null>(null);
  const [hubGeneratedAt, setHubGeneratedAt] = useState<string | null>(null);
  const [hubExcludedFromStatsCount, setHubExcludedFromStatsCount] = useState(0);

  const hubPollReadyRef = useRef(false);
  /** Monotonic id for replace-mode hub-dashboard fetches; drop stale responses when poll/refresh overlap. */
  const hubDashboardReplaceGenRef = useRef(0);

  const fetchSupabaseUsers = useCallback(async () => {
    try {
      setSupabaseLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please ensure you have admin access.');
        }
        throw new Error('Failed to fetch users');
      }

      const data = (await response.json()) as UserProfile[];
      setSupabaseUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[ManageUsers] Error fetching Supabase users:', err);
      }
    } finally {
      setSupabaseLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSupabaseUsers();
  }, [fetchSupabaseUsers]);

  const applyHubDashboardResponse = useCallback((data: HubDashboardJson, mode: 'replace' | 'append') => {
    setHubStatsConfigured(data.configured);
    setMergeHubConfigured(data.configured);
    if (!data.configured) {
      setHubQuickStats(null);
      setHubGeneratedAt(null);
      setHubExcludedFromStatsCount(0);
      setFirestoreUsers([]);
      setMergeHubUsers([]);
      setFirestoreNextOffset(null);
      setFirestoreTotalUsers(0);
      setFirestoreConfigured(false);
      setFirestoreStatus('ready');
      return;
    }
    setHubQuickStats(data.quickStats);
    setHubGeneratedAt(data.generatedAt);
    setHubExcludedFromStatsCount(data.excludedFromStatsCount);
    setFirestoreConfigured(true);
    setFirestoreTotalUsers(data.totalUsers);
    if (mode === 'replace') {
      setFirestoreUsers(data.users);
      setMergeHubUsers(data.users);
      setFirestoreNextOffset(data.nextOffset);
    } else {
      setFirestoreUsers((prev) => [...prev, ...data.users]);
      setMergeHubUsers((prev) => [...prev, ...data.users]);
      setFirestoreNextOffset(data.nextOffset);
    }
    setFirestoreStatus('ready');
  }, []);

  const fetchHubDashboard = useCallback(
    async (offset: number, options: { append?: boolean; skipBootstrapSpinner?: boolean } = {}) => {
      const append = options.append ?? false;
      const skipBootstrapSpinner = options.skipBootstrapSpinner ?? false;
      const replaceGenAtStart = !append ? ++hubDashboardReplaceGenRef.current : null;
      if (!append && !skipBootstrapSpinner) setHubBootstrapLoading(true);
      if (!append) setError(null);
      try {
        const params = new URLSearchParams({ limit: '100', offset: String(offset) });
        const response = await fetch(`/api/admin/users/hub-dashboard?${params}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please ensure you have admin access.');
          }
          throw new Error('Failed to load Hub dashboard');
        }
        const data = (await response.json()) as HubDashboardJson;
        if (!append && replaceGenAtStart !== hubDashboardReplaceGenRef.current) {
          return;
        }
        applyHubDashboardResponse(data, append ? 'append' : 'replace');
        hubPollReadyRef.current = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load Hub data';
        if (!append && replaceGenAtStart !== hubDashboardReplaceGenRef.current) {
          return;
        }
        if (!append) {
          setHubStatsConfigured(false);
          setHubQuickStats(null);
          setHubGeneratedAt(null);
          setHubExcludedFromStatsCount(0);
          setMergeHubConfigured(false);
          setFirestoreUsers([]);
          setMergeHubUsers([]);
          setFirestoreNextOffset(null);
          setFirestoreTotalUsers(0);
          setFirestoreConfigured(false);
          setFirestoreStatus('ready');
        }
        setError(msg);
        if (import.meta.env.DEV) {
          console.error('[ManageUsers] Hub dashboard fetch failed:', err);
        }
        if (append) throw err instanceof Error ? err : new Error(String(err));
      } finally {
        if (
          !append &&
          !skipBootstrapSpinner &&
          replaceGenAtStart === hubDashboardReplaceGenRef.current
        ) {
          setHubBootstrapLoading(false);
        }
      }
    },
    [applyHubDashboardResponse]
  );

  useEffect(() => {
    void fetchHubDashboard(0, {});
  }, [fetchHubDashboard]);

  // Admin-only page; interval refreshes stats+snapshot. Uses full Hub scan server-side by design
  // (see hub-dashboard) so we keep a modest cadence instead of a second lighter API.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!hubPollReadyRef.current) return;
      void fetchHubDashboard(0, { skipBootstrapSpinner: true });
    }, 60_000);
    return () => clearInterval(id);
  }, [fetchHubDashboard]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && hubPollReadyRef.current) {
        void fetchHubDashboard(0, { skipBootstrapSpinner: true });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchHubDashboard]);

  // Load more via hub-dashboard (not cursor firestore) so appended rows stay on the same signup-sorted
  // snapshot as quick stats; server rescans each time by intentional tradeoff.
  const loadMoreFirestore = async () => {
    if (firestoreNextOffset === null || firestorePageLoading) return;
    setFirestorePageLoading(true);
    setError(null);
    try {
      await fetchHubDashboard(firestoreNextOffset, { append: true, skipBootstrapSpinner: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load more';
      setError(msg);
      if (import.meta.env.DEV) {
        console.error('[ManageUsers] Error loading more Hub users:', err);
      }
    } finally {
      setFirestorePageLoading(false);
    }
  };

  const handleRevokeSessions = async (uid: string) => {
    if (
      !window.confirm('Revoke all sessions for this user? They will be signed out on all devices.')
    ) {
      return;
    }
    setRevokingUid(uid);
    try {
      const response = await fetch(`/api/admin/users/${uid}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to revoke sessions');
      }
      await fetchSupabaseUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke sessions';
      setError(msg);
    } finally {
      setRevokingUid(null);
    }
  };

  const mergedRows = useMemo(
    () => buildMergedRows(supabaseUsers, mergeHubUsers),
    [supabaseUsers, mergeHubUsers]
  );

  const supabaseSortedBySignup = useMemo(() => {
    return [...supabaseUsers].sort((a, b) => compareSignupDesc(a.createdAt, b.createdAt));
  }, [supabaseUsers]);

  const filteredSupabase = useMemo(() => {
    if (!searchQuery) return supabaseSortedBySignup;
    const q = searchQuery.toLowerCase();
    return supabaseSortedBySignup.filter(
      (user) =>
        user.email?.toLowerCase().includes(q) ||
        (user.displayName?.toLowerCase().includes(q) ?? false) ||
        user.uid.toLowerCase().includes(q)
    );
  }, [supabaseSortedBySignup, searchQuery]);

  const filteredFirestore = useMemo(() => {
    if (!searchQuery) return firestoreUsers;
    const q = searchQuery.toLowerCase();
    return firestoreUsers.filter(
      (user) =>
        user.email?.toLowerCase().includes(q) ||
        (user.displayName?.toLowerCase().includes(q) ?? false) ||
        user.firebaseUid.toLowerCase().includes(q) ||
        (user.growthState?.toLowerCase().includes(q) ?? false)
    );
  }, [firestoreUsers, searchQuery]);

  const filteredMerged = useMemo(() => {
    if (!searchQuery) return mergedRows;
    const q = searchQuery.toLowerCase();
    return mergedRows.filter((row) => {
      if (row.source === 'supabase') {
        const u = row.profile;
        return (
          u.email?.toLowerCase().includes(q) ||
          (u.displayName?.toLowerCase().includes(q) ?? false) ||
          u.uid.toLowerCase().includes(q)
        );
      }
      const u = row.profile;
      return (
        u.email?.toLowerCase().includes(q) ||
        (u.displayName?.toLowerCase().includes(q) ?? false) ||
        u.firebaseUid.toLowerCase().includes(q) ||
        (u.growthState?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [mergedRows, searchQuery]);

  const filteredMergedSorted = useMemo(() => {
    const rows = [...filteredMerged];
    rows.sort((a, b) => {
      const ca =
        a.source === 'supabase' ? a.profile.createdAt : (a.profile.createdAt ?? undefined);
      const cb =
        b.source === 'supabase' ? b.profile.createdAt : (b.profile.createdAt ?? undefined);
      return compareSignupDesc(ca, cb);
    });
    return rows;
  }, [filteredMerged]);

  const useHubQuickStats = hubStatsConfigured === true && hubQuickStats !== null;
  const signupQuickStats = useMemo(() => {
    if (useHubQuickStats && hubQuickStats) {
      return hubQuickStats;
    }
    return computeSignupQuickStats(supabaseUsers, new Date(), {
      timeZone: ADMIN_STATS_TIMEZONE,
    });
  }, [useHubQuickStats, hubQuickStats, supabaseUsers]);

  const quickStatsLoading = hubBootstrapLoading || (!useHubQuickStats && supabaseLoading);

  /** Same hub-dashboard snapshot as list + period stats; Supabase = auth list length. */
  const quickStatsTotalUsers = useHubQuickStats ? firestoreTotalUsers : supabaseUsers.length;

  const loading =
    tab === 'supabase'
      ? supabaseLoading
      : tab === 'firestore'
        ? firestoreStatus === 'loading'
        : supabaseLoading || hubBootstrapLoading;

  const showTable =
    !error &&
    (tab === 'supabase'
      ? !supabaseLoading
      : tab === 'firestore'
        ? firestoreStatus === 'ready'
        : !supabaseLoading && !hubBootstrapLoading);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Manage Users</h1>
          <p className="mt-2 text-white/60">View and manage user accounts</p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Add User functionality coming soon"
          className="cursor-not-allowed rounded-lg bg-[#ffbf00]/70 px-4 py-2 font-medium text-black opacity-60"
        >
          Add User (coming soon)
        </button>
      </div>

      <div
        className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1"
        role="tablist"
        aria-label="User source"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`${TAB_CLASS} ${tab === 'all' ? TAB_ACTIVE : TAB_INACTIVE}`}
          onClick={() => setTab('all')}
        >
          All users
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'supabase'}
          className={`${TAB_CLASS} ${tab === 'supabase' ? TAB_ACTIVE : TAB_INACTIVE}`}
          onClick={() => setTab('supabase')}
        >
          Supabase (Auth)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'firestore'}
          className={`${TAB_CLASS} ${tab === 'firestore' ? TAB_ACTIVE : TAB_INACTIVE}`}
          onClick={() => setTab('firestore')}
        >
          Firestore (Hub)
        </button>
      </div>

      {tab === 'all' && mergeHubConfigured === false && (
        <p className="text-sm text-white/50">
          Hub slice: Firebase is not configured on this admin host — only Supabase rows appear in
          this merged list.
        </p>
      )}
      {tab === 'all' && mergeHubConfigured === true && (
        <p className="text-sm text-white/50">
          Merged view: same Hub snapshot as quick stats (newest signups first), first page plus all
          Supabase Auth users; not deduplicated. Use the Firestore tab to load more Hub rows.
        </p>
      )}

      {tab === 'firestore' && firestoreStatus === 'ready' && firestoreConfigured === false && (
        <p className="text-sm text-amber-400/90">
          Firebase Admin is not configured — cannot list Hub Firestore users.
        </p>
      )}

      <div className="flex flex-wrap gap-3 rounded-lg border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
        <div className="flex w-full flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-xs text-white/45">
            {useHubQuickStats ? (
              <>
                Hub quick stats and table share one snapshot (sorted by signup). Calendar:{' '}
                {ADMIN_STATS_TIMEZONE}.
                {hubExcludedFromStatsCount > 0 && (
                  <>
                    {' '}
                    {hubExcludedFromStatsCount} user
                    {hubExcludedFromStatsCount !== 1 ? 's' : ''} missing parseable{' '}
                    <code className="text-white/60">created_at</code> — listed but excluded from
                    counts.
                  </>
                )}
                {hubGeneratedAt && (
                  <>
                    {' '}
                    Snapshot: {formatHubSnapshotAt(hubGeneratedAt)}.
                  </>
                )}
              </>
            ) : (
              `Quick stats: Supabase Auth created_at — calendar in ${ADMIN_STATS_TIMEZONE} (Hub not configured or unavailable).`
            )}
          </p>
          {useHubQuickStats && (
            <button
              type="button"
              onClick={() => void fetchHubDashboard(0, {})}
              disabled={hubBootstrapLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
              title="Reload Hub stats and first page from Firestore"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${hubBootstrapLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
        </div>
        <div className="min-w-[140px] flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            Today (new signups)
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">
            {quickStatsLoading ? '—' : signupQuickStats.today}
          </p>
        </div>
        <div className="hidden h-10 w-px self-center bg-white/10 sm:block" aria-hidden />
        <div className="min-w-[160px] flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            Week to date
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">
            {quickStatsLoading ? '—' : signupQuickStats.wtd.count}
          </p>
          <p
            className={`mt-0.5 text-sm tabular-nums ${
              quickStatsLoading
                ? 'text-white/40'
                : signupQuickStats.wtd.pctVsPrev === null
                  ? 'text-white/50'
                  : signupQuickStats.wtd.pctVsPrev >= 0
                    ? 'text-emerald-400/90'
                    : 'text-rose-400/90'
            }`}
            title={
              useHubQuickStats
                ? 'vs same span last week (Firestore Hub)'
                : 'vs same span last week (Supabase Auth)'
            }
          >
            {quickStatsLoading
              ? '—'
              : `${formatDeltaPct(signupQuickStats.wtd.pctVsPrev)} vs prior WTD`}
          </p>
        </div>
        <div className="hidden h-10 w-px self-center bg-white/10 sm:block" aria-hidden />
        <div className="min-w-[160px] flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">
            Month to date
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">
            {quickStatsLoading ? '—' : signupQuickStats.mtd.count}
          </p>
          <p
            className={`mt-0.5 text-sm tabular-nums ${
              quickStatsLoading
                ? 'text-white/40'
                : signupQuickStats.mtd.pctVsPrev === null
                  ? 'text-white/50'
                  : signupQuickStats.mtd.pctVsPrev >= 0
                    ? 'text-emerald-400/90'
                    : 'text-rose-400/90'
            }`}
            title={
              useHubQuickStats
                ? 'vs same calendar day/time last month (Firestore Hub)'
                : 'vs same calendar day/time last month (Supabase Auth)'
            }
          >
            {quickStatsLoading
              ? '—'
              : `${formatDeltaPct(signupQuickStats.mtd.pctVsPrev)} vs prior MTD`}
          </p>
        </div>
        <div className="hidden h-10 w-px self-center bg-white/10 sm:block" aria-hidden />
        <div className="min-w-[120px] flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">Total users</p>
          <p
            className="mt-1 font-heading text-2xl font-bold tabular-nums text-white"
            title={
              useHubQuickStats
                ? 'All Hub user documents in the current snapshot (same as table total)'
                : 'Supabase Auth users loaded for this view'
            }
          >
            {quickStatsLoading ? '—' : quickStatsTotalUsers}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-10 py-2 text-white placeholder:text-white/40 focus:border-[#ffbf00]/50 focus:outline-none focus:ring-2 focus:ring-[#ffbf00]/20"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-2 text-white transition-colors hover:bg-white/5"
        >
          <Filter className="h-5 w-5" />
          <span>Filter</span>
        </button>
      </div>

      {loading && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
          <p className="text-white/60">Loading users...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6 backdrop-blur-sm">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {showTable && tab === 'supabase' && (
        <>
          <div className={TABLE_SCROLL_CLASS}>
            <table className={TABLE_INNER_CLASS}>
              <thead className="border-b border-white/10 bg-black/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Auth</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Purchased
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSupabase.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-white/60">
                      {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredSupabase.map((user) => (
                    <tr key={user.uid} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="font-medium">{user.displayName || user.email || 'N/A'}</div>
                        <div className="mt-0.5 font-mono text-xs text-white/50" title="UID">
                          {user.uid}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/70">{user.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">
                        {formatProviderIds(user.providerIds)}
                        {user.emailVerified && (
                          <span className="ml-1 text-xs text-green-400" title="Email verified">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.isAdmin ? (
                          <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
                            Admin
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-white/70">{purchasedLabel(user.purchasedIndex)}</td>
                      <td className="px-6 py-4 text-white/70">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeSessions(user.uid)}
                          disabled={revokingUid === user.uid}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                          title="Revoke sessions (sign out on all devices)"
                        >
                          <LogOut className="h-4 w-4" />
                          {revokingUid === user.uid ? 'Revoking…' : 'Revoke sessions'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-white/60">
            <div>
              Showing {filteredSupabase.length} of {supabaseUsers.length} user
              {supabaseUsers.length !== 1 ? 's' : ''}
              {searchQuery && ` (filtered from ${supabaseUsers.length} total)`}
            </div>
          </div>
        </>
      )}

      {showTable && tab === 'firestore' && firestoreConfigured === true && (
        <>
          <div className={TABLE_SCROLL_CLASS}>
            <table className={TABLE_INNER_CLASS}>
              <thead className="border-b border-white/10 bg-black/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Growth state
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Trial ends
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Purchased
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFirestore.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-white/60">
                      {searchQuery ? 'No users found matching your search.' : 'No Hub users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredFirestore.map((user) => (
                    <tr key={user.firebaseUid} className="transition-colors hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="font-medium">{user.displayName || user.email || 'N/A'}</div>
                        <div className="mt-0.5 font-mono text-xs text-white/50" title="Firebase UID">
                          {user.firebaseUid}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/70">{user.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-white/70">{user.growthState ?? '—'}</td>
                      <td className="px-6 py-4 text-white/70">{formatDate(user.trialEndsAt)}</td>
                      <td className="px-6 py-4 text-white/70">{purchasedLabel(user.purchasedIndex)}</td>
                      <td className="px-6 py-4 text-white/70">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {filteredFirestore.length} of {firestoreUsers.length} loaded
              {firestoreTotalUsers > 0 && ` (${firestoreTotalUsers} total in Hub)`}
              {searchQuery && ` — filtered from ${firestoreUsers.length} on this page`}
            </div>
            {firestoreNextOffset !== null ? (
              <button
                type="button"
                onClick={() => void loadMoreFirestore()}
                disabled={firestorePageLoading}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                {firestorePageLoading ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </div>
        </>
      )}

      {showTable && tab === 'firestore' && firestoreConfigured === false && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-8 text-center text-white/60">
          Configure <code className="text-white/80">FIREBASE_SERVICE_ACCOUNT_KEY</code> on this host
          to list Hub users.
        </div>
      )}

      {showTable && tab === 'all' && (
        <>
          <div className={TABLE_SCROLL_CLASS}>
            <table className={TABLE_INNER_WIDE_CLASS}>
              <thead className="border-b border-white/10 bg-black/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Auth</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Growth state
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                    Purchased
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">Created</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMergedSorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-white/60">
                      {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredMergedSorted.map((row) => {
                    const key =
                      row.source === 'supabase'
                        ? `s:${row.profile.uid}`
                        : `f:${row.profile.firebaseUid}`;
                    return (
                      <tr key={key} className="transition-colors hover:bg-white/5">
                        <td className="px-6 py-4 text-white/70">
                          {row.source === 'supabase' ? (
                            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">
                              Supabase
                            </span>
                          ) : (
                            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-200">
                              Hub
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {row.source === 'supabase' ? (
                            <>
                              <div className="font-medium">
                                {row.profile.displayName || row.profile.email || 'N/A'}
                              </div>
                              <div className="mt-0.5 font-mono text-xs text-white/50" title="UID">
                                {row.profile.uid}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-medium">
                                {row.profile.displayName || row.profile.email || 'N/A'}
                              </div>
                              <div
                                className="mt-0.5 font-mono text-xs text-white/50"
                                title="Firebase UID"
                              >
                                {row.profile.firebaseUid}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {row.source === 'supabase'
                            ? row.profile.email || 'N/A'
                            : row.profile.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {row.source === 'supabase' ? (
                            <>
                              {formatProviderIds(row.profile.providerIds)}
                              {row.profile.emailVerified && (
                                <span className="ml-1 text-xs text-green-400" title="Email verified">
                                  ✓
                                </span>
                              )}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {row.source === 'supabase' ? (
                            row.profile.isAdmin ? (
                              <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
                                Admin
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                                User
                              </span>
                            )
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {row.source === 'firestore' ? row.profile.growthState ?? '—' : '—'}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {purchasedLabel(
                            row.source === 'supabase'
                              ? row.profile.purchasedIndex
                              : row.profile.purchasedIndex
                          )}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {row.source === 'supabase'
                            ? formatDate(row.profile.createdAt)
                            : formatDate(row.profile.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {row.source === 'supabase' ? (
                            <button
                              type="button"
                              onClick={() => handleRevokeSessions(row.profile.uid)}
                              disabled={revokingUid === row.profile.uid}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                              title="Revoke sessions (sign out on all devices)"
                            >
                              <LogOut className="h-4 w-4" />
                              {revokingUid === row.profile.uid ? 'Revoking…' : 'Revoke sessions'}
                            </button>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-white/60">
            Showing {filteredMergedSorted.length} of {mergedRows.length} row
            {mergedRows.length !== 1 ? 's' : ''}
            {searchQuery && filteredMergedSorted.length !== mergedRows.length
              ? ` (${mergedRows.length - filteredMergedSorted.length} hidden by search)`
              : ''}
          </div>
        </>
      )}
    </div>
  );
};

export default ManageUsers;
