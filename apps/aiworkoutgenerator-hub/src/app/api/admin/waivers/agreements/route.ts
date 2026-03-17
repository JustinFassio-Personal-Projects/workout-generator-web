import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import type { UserWaiverAgreement } from "@/types/firestore";
import { extractBearerToken, isAdmin } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Query Parameters Schema
// ============================================

const QueryParamsSchema = z.object({
  userId: z.string().optional(),
  waiverVersion: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================
// Helper Functions
// ============================================

// ============================================
// GET Handler - List Agreements
// ============================================

export async function GET(request: NextRequest) {
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
      captureApiError(error, {
        endpoint: "admin_waivers_agreements",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/waivers/agreements",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Check admin role
    if (!(await isAdmin(uid))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      userId: searchParams.get("userId") || undefined,
      waiverVersion: searchParams.get("waiverVersion") || undefined,
      limit: searchParams.get("limit") || "100",
      offset: searchParams.get("offset") || "0",
    };

    const parseResult = QueryParamsSchema.safeParse(queryParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { userId, waiverVersion, limit, offset } = parseResult.data;

    // 4. Build query
    let query = adminDb
      .collection("user_waiver_agreements")
      .orderBy("created_at", "desc");

    if (userId) {
      query = query.where("user_id", "==", userId) as typeof query;
    }

    if (waiverVersion) {
      query = query.where(
        "waiver_version",
        "==",
        waiverVersion
      ) as typeof query;
    }

    // Note: Firestore doesn't support offset directly, so we'll fetch and slice
    const snapshot = await query.limit(limit + offset).get();

    // 5. Apply offset and limit
    const allDocs = snapshot.docs;
    const paginatedDocs = allDocs.slice(offset, offset + limit);

    const agreements = paginatedDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserWaiverAgreement[];

    // 6. Get total count (for pagination info)
    const totalSnapshot = await (
      userId || waiverVersion
        ? query
        : adminDb.collection("user_waiver_agreements")
    )
      .count()
      .get();
    const totalCount = totalSnapshot.data().count;

    return NextResponse.json({
      success: true,
      agreements,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_waivers_agreements",
      operation: "list_agreements",
    });
    logger.error("Error listing agreements", error, {
      route: "/api/admin/waivers/agreements",
      operation: "list_agreements",
    });
    return NextResponse.json(
      {
        error: "Failed to list agreements",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
