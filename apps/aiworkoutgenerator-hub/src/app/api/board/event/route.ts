import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken, getUserClaims } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
// ProfileService is client-side only - fetch profile directly via Admin SDK
import type { BoardEvent, BoardEventType, BoardSurface } from "@/types/board";
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from "@/lib/subscription-constants";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Request Schemas
// ============================================

const LogEventSchema = z.object({
  post_id: z.string().min(1, "Post ID is required"),
  event_type: z.enum(["impression", "click", "dismiss"]),
  surface: z.enum(["banner", "section", "feed", "detail"]),
});

// ============================================
// POST Handler - Log Event
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Authenticate request (optional for anonymous users)
    const idToken = extractBearerToken(request);
    let uid: string | null = null;
    let subscription: {
      tier: SubscriptionTier;
      status: SubscriptionStatus;
    } | null = null;
    let profile: {
      fitness_level?: string;
      equipment_access?: string[]; // Changed from string to string[] categories
    } | null = null;

    if (idToken) {
      try {
        const decodedToken = await verifyIdToken(idToken);
        uid = decodedToken.uid;

        // Get subscription claims
        const claims = await getUserClaims(uid);
        subscription = {
          tier: (claims.subscription_tier as SubscriptionTier) || "free",
          status: (claims.subscription_status as SubscriptionStatus) || null,
        };

        // Get profile snapshot via Admin SDK
        try {
          const userProfileDoc = await adminDb
            .collection("user_profiles")
            .doc(uid)
            .get();
          if (userProfileDoc.exists) {
            const userProfileData = userProfileDoc.data();
            if (userProfileData) {
              profile = {
                fitness_level: userProfileData.fitness_level,
                equipment_access: userProfileData.equipment_access,
              };
            }
          }
        } catch (profileError) {
          // Profile fetch failed, continue without it
          logger.warn(
            "Failed to fetch profile for event logging",
            profileError,
            {
              route: "/api/board/event",
              userId: uid,
            }
          );
        }
      } catch (error) {
        // Token invalid - allow anonymous event logging
        logger.warn(
          "Token verification failed, logging anonymous event",
          error,
          {
            route: "/api/board/event",
          }
        );
      }
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parseResult = LogEventSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { post_id, event_type, surface } = parseResult.data;

    // 3. Create event document
    const eventRef = adminDb.collection("board_events").doc();
    const now = Timestamp.now();

    const event = {
      post_id,
      user_id: uid,
      event_type: event_type as BoardEventType,
      surface: surface as BoardSurface,
      created_at: now,
      ...(subscription && {
        subscription_tier: subscription.tier,
        subscription_status: subscription.status,
      }),
      ...(profile && {
        fitness_level: profile.fitness_level,
        equipment_access: profile.equipment_access,
      }),
    } as Omit<BoardEvent, "id">;

    await eventRef.set(event);

    return NextResponse.json({
      success: true,
      event_id: eventRef.id,
    });
  } catch (error) {
    captureApiError(error, { endpoint: "board_event" });
    logger.error("Error logging board event", error, {
      route: "/api/board/event",
    });
    return NextResponse.json(
      {
        error: "Failed to log event",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
