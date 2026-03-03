/**
 * Types for admin users list (Manage Users). Matches shape from profiles + admin_users.
 */
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
