/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { APIRoute } from 'astro';

import { verifyAdminRequest } from '@/lib/supabase/admin/auth';
import { listPipelineUsersFromFirestore } from '@/lib/admin/growth-engine/pipeline-users-firestore';
import { getFirebaseFirestore } from '@/lib/firebase/admin';
import type { FirestoreHubUser } from '@/types/admin-users';

export const prerender = false;

function parseLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.min(500, Math.max(1, n));
}

function pipelineRowToHubUser(row: {
  id: string;
  email: string | null;
  displayName: string | null;
  growthState: string | null;
  trialEndsAt: string | null;
  purchasedIndex: number | null;
  createdAt: string | null;
}): FirestoreHubUser {
  return {
    firebaseUid: row.id,
    email: row.email,
    displayName: row.displayName,
    growthState: row.growthState,
    trialEndsAt: row.trialEndsAt,
    purchasedIndex: row.purchasedIndex,
    createdAt: row.createdAt,
  };
}

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    await verifyAdminRequest(request, cookies);

    if (!getFirebaseFirestore()) {
      return new Response(
        JSON.stringify({
          users: [] as FirestoreHubUser[],
          nextCursor: null,
          configured: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const limit = parseLimit(url.searchParams.get('limit'));
    const cursor = url.searchParams.get('cursor');

    const { users, nextCursor } = await listPipelineUsersFromFirestore({
      limit,
      cursor: cursor || null,
      forAdminList: true,
    });

    const body = {
      users: users.map(pipelineRowToHubUser),
      nextCursor,
      configured: true,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED' || error.message === 'UNAUTHORIZED') {
        return new Response(JSON.stringify({ error: 'Unauthorized. Admin access required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
      console.error('[admin/users/firestore] Error:', error);
    }

    return new Response(JSON.stringify({ error: 'Failed to fetch Firestore users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
