/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side statistics for admin: users list from Auth Admin API + admin_users for isAdmin.
 * Uses auth.admin.listUsers() so the admin Users page works even when public.profiles does not exist.
 */

import type { UserProfile } from '@/types/admin-users';
import { getSupabaseServiceRole } from '../server';

const AUTH_LIST_PAGE_SIZE = 1000;

/**
 * Fetch all users via Auth Admin API (auth.users), with isAdmin from admin_users.
 * Does not require public.profiles table.
 */
export async function getAllUsersServer(): Promise<UserProfile[]> {
  const supabase = getSupabaseServiceRole();

  const adminIdSet = new Set<string>();
  const { data: adminRows } = await supabase.from('admin_users').select('id');
  if (adminRows) adminRows.forEach((r) => adminIdSet.add(r.id));

  const users: UserProfile[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: AUTH_LIST_PAGE_SIZE,
    });

    if (error) {
      if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
        console.error('[getAllUsersServer] Error listing auth users:', error);
      }
      throw error;
    }

    const list = data?.users ?? [];
    for (const u of list) {
      const createdAt =
        typeof u.created_at === 'string' ? u.created_at : new Date(u.created_at ?? 0).toISOString();
      const meta = (u.user_metadata as Record<string, unknown>) ?? {};
      users.push({
        uid: u.id,
        email: u.email ?? null,
        displayName: (meta.full_name as string) ?? (meta.name as string) ?? undefined,
        role: 'client',
        isAdmin: adminIdSet.has(u.id),
        purchasedIndex: undefined,
        createdAt,
        avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? undefined,
      });
    }

    hasMore = list.length === AUTH_LIST_PAGE_SIZE;
    page += 1;
  }

  users.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return users;
}

/**
 * Fetch all users for admin display. Same as getAllUsersServer (Supabase does not expose providerIds/emailVerified).
 */
export async function getAllUsersWithAuthServer(): Promise<UserProfile[]> {
  return getAllUsersServer();
}
