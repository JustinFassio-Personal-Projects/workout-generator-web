import { NextRequest, NextResponse } from "next/server";

import { verifyAppCheckToken } from "@/lib/firebase-admin";

const APP_CHECK_HEADER = "X-Firebase-AppCheck";

/**
 * When unset or falsy, App Check is disabled (e.g. local dev, emulator).
 * Set to "true" or "1" in production to require valid App Check tokens.
 */
function isAppCheckEnabled(): boolean {
  const v = process.env.FIREBASE_APP_CHECK_ENABLED;
  return v === "true" || v === "1";
}

export type RequireAppCheckResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Require a valid Firebase App Check token for the request.
 * Call at the start of API handlers that use verifyIdToken.
 *
 * When FIREBASE_APP_CHECK_ENABLED is not set, returns { ok: true } (no-op)
 * so development and emulator flows are not blocked.
 *
 * When enabled: reads X-Firebase-AppCheck header; if missing or invalid,
 * returns { ok: false, response } with 401. On success returns { ok: true }.
 *
 * Rollout: Before enabling FIREBASE_APP_CHECK_ENABLED in production, ensure
 * all client callers attach the X-Firebase-AppCheck header (e.g. via
 * getAppCheckHeaders() from @/lib/firebase). Otherwise legitimate traffic
 * will receive 401. See docs/setup/FIREBASE_APP_CHECK.md.
 *
 * @param request - Next.js request object
 * @returns { ok: true } or { ok: false, response: NextResponse }
 */
export async function requireAppCheck(
  request: NextRequest
): Promise<RequireAppCheckResult> {
  if (!isAppCheckEnabled()) {
    return { ok: true };
  }

  const token = request.headers.get(APP_CHECK_HEADER);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing App Check token" },
        { status: 401 }
      ),
    };
  }

  try {
    await verifyAppCheckToken(token);
    return { ok: true };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid App Check token" },
        { status: 401 }
      ),
    };
  }
}
