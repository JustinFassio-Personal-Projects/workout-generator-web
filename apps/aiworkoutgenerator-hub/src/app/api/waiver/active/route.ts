import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getActiveWaiver } from "@/lib/waiver/getActiveWaiver";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/waiver/active
 *
 * Returns the currently active waiver version.
 * Used by the frontend app to display the waiver to users.
 *
 * Authentication: Optional. Waiver content is public; we return it even when
 * the token is missing or invalid so users can always load and sign the waiver.
 * POST /api/waiver/agree still requires a valid token to record the agreement.
 *
 * Response:
 * - 200: { waiver: LiabilityWaiver } - Active waiver found
 * - 200: { waiver: null } - No active waiver (users can proceed without agreement)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Optional auth: allow unauthenticated or invalid token so users can always load the waiver.
    // Token verification failures (e.g. server credential mismatch, expired token) are logged but do not block.
    const idToken = extractBearerToken(request);
    if (idToken) {
      try {
        await verifyIdToken(idToken);
      } catch (error) {
        logger.warn(
          "Token verification failed for waiver/active (returning waiver anyway)",
          error,
          {
            route: "/api/waiver/active",
            operation: "token_verification",
          }
        );
      }
    }

    // Get active waiver (onError logs Firestore failures with structured errorCode/errorMessage for Cloud Run)
    const waiver = await getActiveWaiver({
      onError: (error) => {
        const err = error as { code?: string; message?: string } | null;
        captureApiError(error, {
          endpoint: "waiver_active",
          operation: "get_active_waiver",
        });
        logger.error("Error fetching active waiver", error, {
          route: "/api/waiver/active",
          operation: "get_active_waiver",
          errorCode: err?.code ?? "unknown",
          errorMessage: err?.message ?? String(error),
        });
      },
    });

    if (!waiver) {
      return NextResponse.json({
        waiver: null,
        message: "No active waiver found",
      });
    }

    return NextResponse.json({ waiver });
  } catch (error) {
    captureApiError(error, {
      endpoint: "waiver_active",
      operation: "get_active_waiver",
    });
    const err = error as { code?: string; message?: string } | null;
    logger.error("Error fetching active waiver", error, {
      route: "/api/waiver/active",
      operation: "get_active_waiver",
      errorCode: err?.code ?? "unknown",
      errorMessage: err?.message ?? String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to fetch active waiver",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
