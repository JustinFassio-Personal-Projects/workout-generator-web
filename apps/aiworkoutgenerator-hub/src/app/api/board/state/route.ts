import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import type { BoardUserState, BoardPostUserState } from "@/types/board";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Request Schemas
// ============================================

const UpdateStateSchema = z.object({
  post_id: z.string().min(1, "Post ID is required"),
  action: z.enum(["dismiss", "impression", "click"]),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Prune old post state entries (keep last 90 days or last 100 posts)
 */
function pruneOldState(state: BoardUserState): BoardUserState {
  const now = Timestamp.now();
  const ninetyDaysAgo = new Date(now.toMillis() - 90 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgoTimestamp = Timestamp.fromDate(ninetyDaysAgo);

  const entries = Object.entries(state.posts);

  // Filter entries that are older than 90 days
  const recentEntries = entries.filter(([, postState]) => {
    const lastActivity =
      postState.last_impression_at ||
      postState.last_click_at ||
      postState.dismissed_at;
    if (!lastActivity) return true; // Keep entries with no activity timestamp

    const lastActivityTimestamp =
      lastActivity instanceof Timestamp
        ? lastActivity
        : Timestamp.fromDate(new Date(lastActivity.seconds * 1000));

    return lastActivityTimestamp >= ninetyDaysAgoTimestamp;
  });

  // If we still have more than 100 entries, keep the 100 most recent
  let prunedEntries = recentEntries;
  if (recentEntries.length > 100) {
    // Sort by last activity (most recent first)
    prunedEntries = recentEntries
      .sort(([, a], [, b]) => {
        const aTime = a.last_impression_at || a.last_click_at || a.dismissed_at;
        const bTime = b.last_impression_at || b.last_click_at || b.dismissed_at;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        const aTimestamp =
          aTime instanceof Timestamp
            ? aTime
            : Timestamp.fromDate(new Date(aTime.seconds * 1000));
        const bTimestamp =
          bTime instanceof Timestamp
            ? bTime
            : Timestamp.fromDate(new Date(bTime.seconds * 1000));
        return bTimestamp.toMillis() - aTimestamp.toMillis();
      })
      .slice(0, 100);
  }

  return {
    ...state,
    posts: Object.fromEntries(prunedEntries),
  };
}

// ============================================
// POST Handler - Update User State
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      logger.error("Token verification failed", error, {
        route: "/api/board/state",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateStateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { post_id, action } = parseResult.data;

    // 3. Get current user state (or create new)
    const userStateRef = adminDb.collection("board_user_state").doc(uid);
    const userStateSnap = await userStateRef.get();

    let currentState: BoardUserState;
    if (userStateSnap.exists) {
      currentState = userStateSnap.data() as BoardUserState;
    } else {
      currentState = {
        user_id: uid,
        posts: {},
        updated_at: Timestamp.now() as unknown as BoardUserState["updated_at"],
      };
    }

    // 4. Update post state based on action
    const now = Timestamp.now();
    const currentPostState =
      currentState.posts[post_id] || ({} as BoardPostUserState);

    let updatedPostState: BoardPostUserState = { ...currentPostState };

    switch (action) {
      case "dismiss":
        updatedPostState = {
          ...updatedPostState,
          dismissed: true,
          dismissed_at: now as unknown as BoardPostUserState["dismissed_at"],
        };
        break;
      case "impression":
        updatedPostState = {
          ...updatedPostState,
          impressions: (updatedPostState.impressions || 0) + 1,
          last_impression_at:
            now as unknown as BoardPostUserState["last_impression_at"],
        };
        break;
      case "click":
        // Activity resets the impression count - user can see post 5 more times
        updatedPostState = {
          ...updatedPostState,
          clicked: true,
          last_click_at: now as unknown as BoardPostUserState["last_click_at"],
          impressions: 0, // Reset impressions when user clicks (activity resets the limit)
        };
        break;
    }

    // 5. Update state
    const updatedState: BoardUserState = {
      ...currentState,
      posts: {
        ...currentState.posts,
        [post_id]: updatedPostState,
      },
      updated_at: now as unknown as BoardUserState["updated_at"],
    };

    // 6. Prune old entries
    const prunedState = pruneOldState(updatedState);

    // 7. Save to Firestore
    await userStateRef.set(prunedState, { merge: false });

    return NextResponse.json({
      success: true,
      state: prunedState,
    });
  } catch (error) {
    captureApiError(error, { endpoint: "board_state" });
    logger.error("Error updating board user state", error, {
      route: "/api/board/state",
    });
    return NextResponse.json(
      {
        error: "Failed to update user state",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
