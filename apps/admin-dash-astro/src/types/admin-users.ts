/**
 * Types for admin users list (Manage Users).
 * Supabase tab: Auth Admin API (`UserProfile`). Firestore tab: Hub `users` collection (`FirestoreHubUser`).
 */

/** Supabase Auth list row from `getAllUsersWithAuthServer` / `GET /api/admin/users`. */
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string;
  role: 'trainer' | 'client' | 'admin';
  isAdmin?: boolean;
  purchasedIndex?: number | null;
  createdAt: string;
  avatarUrl?: string;
  /** Auth provider IDs (e.g. ["google.com"]) — Supabase does not expose; optional. */
  providerIds?: string[];
  /** Email verified — Supabase does not expose; optional. */
  emailVerified?: boolean;
}

export type AdminUsersTabId = 'all' | 'supabase' | 'firestore';

/** Provenance for merged “All” list rows. */
export type AdminUserListSource = 'supabase' | 'firestore';

/** Hub Firestore `users/{docId}` row for admin JSON (`GET /api/admin/users/firestore`). */
export interface FirestoreHubUser {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  growthState: string | null;
  trialEndsAt: string | null;
  purchasedIndex: number | null;
  createdAt: string | null;
}

export type MergedAdminUserRow =
  | { source: 'supabase'; profile: UserProfile }
  | { source: 'firestore'; profile: FirestoreHubUser };
