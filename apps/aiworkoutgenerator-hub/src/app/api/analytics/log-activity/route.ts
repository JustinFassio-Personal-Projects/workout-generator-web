import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getClientIp, resolveIdToken } from "@/lib/api-utils";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import type {
  UserActivityAction,
  UserActivityResourceType,
} from "@/lib/user-activity-logger";
import {
  GENERATION_ID_MAX_LEN,
  WORKOUT_ATTEMPT_ID_MAX_LEN,
} from "@/lib/user-activity-constants";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set<string>([
  "workout:generate",
  "workout:open",
  "workout:start",
  "workout:complete",
  "workout:save",
  "workout:share",
  "profile:update",
  "profile:onboarding_complete",
  "recipe:view",
  "recipe:save",
  "subscription:upgrade",
  "subscription:downgrade",
  "app:open",
  "app:session_start",
  "app:session_end",
]);

const ALLOWED_RESOURCE_TYPES = new Set<string>([
  "workout",
  "profile",
  "recipe",
  "subscription",
  "app",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Persist user activity via Admin SDK (bypasses client Firestore rules).
 * user_id is always taken from the verified ID token.
 */
export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const idToken = resolveIdToken(request, body);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing or invalid authorization" },
        { status: 401 }
      );
    }

    const decoded = await verifyIdToken(idToken);
    const uid = decoded.uid;

    const action = body.action;
    const resourceType = body.resource_type;
    if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (
      typeof resourceType !== "string" ||
      !ALLOWED_RESOURCE_TYPES.has(resourceType)
    ) {
      return NextResponse.json(
        { error: "Invalid resource_type" },
        { status: 400 }
      );
    }

    let resourceId: string | null = null;
    if (body.resource_id !== undefined && body.resource_id !== null) {
      if (typeof body.resource_id !== "string") {
        return NextResponse.json(
          { error: "Invalid resource_id" },
          { status: 400 }
        );
      }
      resourceId = body.resource_id;
    }

    const detailsRaw = body.details;
    const details =
      detailsRaw === undefined || detailsRaw === null
        ? {}
        : isPlainObject(detailsRaw)
          ? detailsRaw
          : null;
    if (details === null) {
      return NextResponse.json({ error: "Invalid details" }, { status: 400 });
    }

    let sessionId: string | undefined;
    if (body.session_id !== undefined && body.session_id !== null) {
      if (typeof body.session_id !== "string") {
        return NextResponse.json(
          { error: "Invalid session_id" },
          { status: 400 }
        );
      }
      sessionId = body.session_id;
    }

    let workoutAttemptId: string | undefined;
    if (
      body.workout_attempt_id !== undefined &&
      body.workout_attempt_id !== null
    ) {
      if (typeof body.workout_attempt_id !== "string") {
        return NextResponse.json(
          { error: "Invalid workout_attempt_id" },
          { status: 400 }
        );
      }
      const trimmed = body.workout_attempt_id.trim();
      if (trimmed.length === 0 || trimmed.length > WORKOUT_ATTEMPT_ID_MAX_LEN) {
        return NextResponse.json(
          { error: "Invalid workout_attempt_id" },
          { status: 400 }
        );
      }
      workoutAttemptId = trimmed;
    }

    let generationId: string | undefined;
    if (body.generation_id !== undefined && body.generation_id !== null) {
      if (typeof body.generation_id !== "string") {
        return NextResponse.json(
          { error: "Invalid generation_id" },
          { status: 400 }
        );
      }
      const trimmed = body.generation_id.trim();
      if (trimmed.length === 0 || trimmed.length > GENERATION_ID_MAX_LEN) {
        return NextResponse.json(
          { error: "Invalid generation_id" },
          { status: 400 }
        );
      }
      generationId = trimmed;
    }

    const forwardedUa = request.headers.get("user-agent");
    const bodyUa = body.user_agent;
    const userAgent =
      typeof bodyUa === "string" && bodyUa.trim()
        ? bodyUa.trim()
        : forwardedUa && forwardedUa.trim()
          ? forwardedUa.trim()
          : null;

    const ipRaw = getClientIp(request);
    const ipAddress = ipRaw === "unknown" ? null : ipRaw;

    await adminDb.collection("user_activity_logs").add({
      user_id: uid,
      action: action as UserActivityAction,
      resource_type: resourceType as UserActivityResourceType,
      resource_id: resourceId,
      details,
      ...(sessionId !== undefined ? { session_id: sessionId } : {}),
      ...(workoutAttemptId !== undefined
        ? { workout_attempt_id: workoutAttemptId }
        : {}),
      ...(generationId !== undefined ? { generation_id: generationId } : {}),
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authErrorCode =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;
    const isAuthError =
      typeof authErrorCode === "string" && authErrorCode.startsWith("auth/");
    if (isAuthError) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    captureApiError(error, {
      endpoint: "analytics_log_activity",
      operation: "log_activity",
    });
    const err = error as { code?: string; message?: string } | null;
    logger.error("Error logging user activity", error, {
      route: "/api/analytics/log-activity",
      operation: "log_activity",
      errorCode: err?.code ?? "unknown",
      errorMessage: err?.message ?? String(error),
    });
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    );
  }
}
