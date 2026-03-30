/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, LogOut } from 'lucide-react';
import type {
  AdminUsersTabId,
  FirestoreHubUser,
  MergedAdminUserRow,
  UserProfile,
} from '@/types/admin-users';

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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

function purchasedLabel(purchasedIndex: number | null | undefined): string {
  if (purchasedIndex !== null && purchasedIndex !== undefined) return `Program ${purchasedIndex}`;
  return 'None';
}

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

  const [firestoreStatus, setFirestoreStatus] = useState<'unset' | 'loading' | 'ready'>('unset');
  const [firestoreUsers, setFirestoreUsers] = useState<FirestoreHubUser[]>([]);
  const [firestoreNextCursor, setFirestoreNextCursor] = useState<string | null>(null);
  const [firestoreConfigured, setFirestoreConfigured] = useState<boolean | null>(null);
  const [firestorePageLoading, setFirestorePageLoading] = useState(false);

  const [mergeHubUsers, setMergeHubUsers] = useState<FirestoreHubUser[]>([]);
  const [mergeHubLoading, setMergeHubLoading] = useState(false);
  const [mergeHubConfigured, setMergeHubConfigured] = useState<boolean | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [revokingUid, setRevokingUid] = useState<string | null>(null);

  /** Avoid re-fetching Hub list when revisiting the tab; reset only on full remount. */
  const firestoreInitialLoadDoneRef = useRef(false);

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

  // Do not put `firestoreStatus` in deps: setting `loading` re-runs the effect, cleanup cancels the
  // in-flight fetch, so Hub users never load. Gate initial fetch with a ref instead.
  useEffect(() => {
    if (tab !== 'firestore') return;
    if (firestoreInitialLoadDoneRef.current) return;

    let cancelled = false;
    setFirestoreStatus('loading');
    setError(null);

    void (async () => {
      try {
        const response = await fetch('/api/admin/users/firestore?limit=100', {
          credentials: 'include',
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please ensure you have admin access.');
          }
          throw new Error('Failed to fetch Firestore users');
        }
        const data = (await response.json()) as {
          users: FirestoreHubUser[];
          nextCursor: string | null;
          configured: boolean;
        };
        if (cancelled) return;
        setFirestoreConfigured(data.configured);
        setFirestoreUsers(data.users);
        setFirestoreNextCursor(data.nextCursor);
        firestoreInitialLoadDoneRef.current = true;
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load Firestore users';
          setError(msg);
          if (import.meta.env.DEV) {
            console.error('[ManageUsers] Error fetching Firestore users (initial):', err);
          }
        }
      } finally {
        if (!cancelled) setFirestoreStatus('ready');
        else setFirestoreStatus('unset');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== 'all') return;

    let cancelled = false;
    setMergeHubLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch('/api/admin/users/firestore?limit=100', {
          credentials: 'include',
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please ensure you have admin access.');
          }
          throw new Error('Failed to fetch Firestore users for merge');
        }
        const data = (await response.json()) as {
          users: FirestoreHubUser[];
          configured: boolean;
        };
        if (cancelled) return;
        setMergeHubConfigured(data.configured);
        setMergeHubUsers(data.users);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load merged list';
          setError(msg);
          if (import.meta.env.DEV) {
            console.error('[ManageUsers] Error fetching Firestore users (merge tab):', err);
          }
        }
      } finally {
        if (!cancelled) setMergeHubLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const loadMoreFirestore = async () => {
    if (!firestoreNextCursor || firestorePageLoading) return;
    setFirestorePageLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', cursor: firestoreNextCursor });
      const response = await fetch(`/api/admin/users/firestore?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load more Firestore users');
      }
      const data = (await response.json()) as {
        users: FirestoreHubUser[];
        nextCursor: string | null;
      };
      setFirestoreUsers((prev) => [...prev, ...data.users]);
      setFirestoreNextCursor(data.nextCursor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load more';
      setError(msg);
      if (import.meta.env.DEV) {
        console.error('[ManageUsers] Error loading more Firestore users:', err);
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

  const firestoreSortedBySignup = useMemo(() => {
    return [...firestoreUsers].sort((a, b) => {
      const byDate = compareSignupDesc(a.createdAt, b.createdAt);
      if (byDate !== 0) return byDate;
      return b.firebaseUid.localeCompare(a.firebaseUid);
    });
  }, [firestoreUsers]);

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
    if (!searchQuery) return firestoreSortedBySignup;
    const q = searchQuery.toLowerCase();
    return firestoreSortedBySignup.filter(
      (user) =>
        user.email?.toLowerCase().includes(q) ||
        (user.displayName?.toLowerCase().includes(q) ?? false) ||
        user.firebaseUid.toLowerCase().includes(q) ||
        (user.growthState?.toLowerCase().includes(q) ?? false)
    );
  }, [firestoreSortedBySignup, searchQuery]);

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

  const loading =
    tab === 'supabase'
      ? supabaseLoading
      : tab === 'firestore'
        ? firestoreStatus === 'loading' || firestoreStatus === 'unset'
        : supabaseLoading || mergeHubLoading;

  const showTable =
    !error &&
    (tab === 'supabase'
      ? !supabaseLoading
      : tab === 'firestore'
        ? firestoreStatus === 'ready'
        : !supabaseLoading && !mergeHubLoading);

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
          Merged view: first 100 Hub users plus all Supabase Auth users; not deduplicated. Use the
          Firestore tab to page through Hub.
        </p>
      )}

      {tab === 'firestore' && firestoreStatus === 'ready' && firestoreConfigured === false && (
        <p className="text-sm text-amber-400/90">
          Firebase Admin is not configured — cannot list Hub Firestore users.
        </p>
      )}

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
              {searchQuery && ` (filtered from ${firestoreUsers.length})`}
            </div>
            {firestoreNextCursor ? (
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
