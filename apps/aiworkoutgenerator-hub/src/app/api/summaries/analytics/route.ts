import { NextRequest, NextResponse } from "next/server";

import { verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { assertReverseTrialAllowsProAnalytics } from "@/lib/reverse-trial/capabilities";
import { computeSummaryAnalyticsAdmin } from "@/lib/summary-analytics-admin";
import { captureApiError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

/**
 * Aggregated workout summary analytics (Admin SDK). Enforces reverse-trial Pro analytics gate
 * when `REVERSE_TRIAL_ENFORCEMENT` is enabled so client Firestore cannot bypass expiry.
 */
export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }
    const decoded = await verifyIdToken(token);
    const uid = decoded.uid;

    const blocked = await assertReverseTrialAllowsProAnalytics(uid);
    if (blocked) return blocked;

    const analytics = await computeSummaryAnalyticsAdmin(uid);
    return NextResponse.json(analytics);
  } catch (error) {
    captureApiError(error, {
      endpoint: "summaries_analytics",
      operation: "get_analytics",
    });
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
