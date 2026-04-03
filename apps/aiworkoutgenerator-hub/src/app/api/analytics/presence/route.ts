import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { resolveIdToken } from "@/lib/api-utils";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import {
  PRESENCE_MIN_INTERVAL_MS,
  shouldSkipPresenceWrite,
} from "@/lib/presence-throttle";

export const dynamic = "force-dynamic";

const SESSION_ID_MAX_LEN = 512;

function getPresenceCollectionName(): string {
  return process.env.FIREBASE_USER_PRESENCE_COLLECTION ?? "user_presence";
}

/**
 * Hub heartbeat: updates user_presence/{uid} with last_seen_at (throttled).
 * Auth: App Check + Bearer ID token (same stack as log-activity).
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

    let sessionId: string | undefined;
    if (body.session_id !== undefined && body.session_id !== null) {
      if (typeof body.session_id !== "string") {
        return NextResponse.json(
          { error: "Invalid session_id" },
          { status: 400 }
        );
      }
      const trimmed = body.session_id.trim();
      if (trimmed.length > SESSION_ID_MAX_LEN) {
        return NextResponse.json(
          { error: "Invalid session_id" },
          { status: 400 }
        );
      }
      sessionId = trimmed.length > 0 ? trimmed : undefined;
    }

    const col = getPresenceCollectionName();
    const ref = adminDb.collection(col).doc(uid);
    const existing = await ref.get();
    const nowMs = Date.now();

    let prevMs: number | null = null;
    if (existing.exists) {
      const data = existing.data();
      const ts = data?.last_seen_at;
      if (ts instanceof Timestamp) {
        prevMs = ts.toMillis();
      }
    }

    if (shouldSkipPresenceWrite(prevMs, nowMs, PRESENCE_MIN_INTERVAL_MS)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await ref.set(
      {
        user_id: uid,
        last_seen_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        ...(sessionId !== undefined ? { session_id: sessionId } : {}),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, skipped: false });
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
      endpoint: "analytics_presence",
      operation: "presence",
    });
    const err = error as { code?: string; message?: string } | null;
    logger.error("Error recording presence", error, {
      route: "/api/analytics/presence",
      operation: "presence",
      errorCode: err?.code ?? "unknown",
      errorMessage: err?.message ?? String(error),
    });
    return NextResponse.json(
      { error: "Failed to record presence" },
      { status: 500 }
    );
  }
}
