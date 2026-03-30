import { NextRequest, NextResponse } from "next/server";

import { verifyIdToken } from "@/lib/firebase-admin";
import { extractBearerToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { getUserCapabilitiesPayload } from "@/lib/reverse-trial/capabilities";
import { captureApiError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

/**
 * Reverse-trial / growth_state signals for client banner and gating UX.
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
    const payload = await getUserCapabilitiesPayload(decoded.uid);
    return NextResponse.json(payload);
  } catch (error) {
    captureApiError(error, {
      endpoint: "users_capabilities",
      operation: "get_capabilities",
    });
    return NextResponse.json(
      { error: "Failed to load capabilities" },
      { status: 500 }
    );
  }
}
