/**
 * Client-side authenticated fetch utility.
 *
 * Handles:
 * - Bearer token attachment (with optional force refresh)
 * - App Check headers when enabled
 * - Automatic retry on 401 with token refresh (handles expired tokens)
 *
 * Use for API routes that require Firebase Auth.
 */

import type { User } from "firebase/auth";
import { getIdToken } from "@/lib/auth";
import { getAppCheckHeaders } from "@/lib/firebase";
import { FIREBASE_ID_TOKEN_BODY_KEY } from "@/lib/firebase-auth-transfer-constants";

export type AuthenticatedFetchOptions = Omit<RequestInit, "headers"> & {
  /** Optional custom headers merged with auth headers */
  headers?: Record<string, string>;
  /** If true, force token refresh before the request (e.g., after 401 retry) */
  forceTokenRefresh?: boolean;
  /** When provided, use this user's token instead of auth.currentUser (avoids timing mismatches) */
  user?: User;
};

/**
 * Embed the ID token in JSON request bodies when possible.
 * Some App Hosting / proxy paths strip all Authorization-style headers; the body still arrives intact.
 */
function mergeFirebaseIdTokenIntoJsonBody(
  body: BodyInit | null | undefined,
  method: string | undefined,
  contentType: string | undefined,
  token: string
): BodyInit | null | undefined {
  if (body == null || typeof body !== "string") {
    return body;
  }
  const m = (method ?? "GET").toUpperCase();
  if (m === "GET" || m === "HEAD") {
    return body;
  }
  const ct = contentType ?? "";
  if (!ct.includes("application/json")) {
    return body;
  }
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return JSON.stringify({
        ...(parsed as Record<string, unknown>),
        [FIREBASE_ID_TOKEN_BODY_KEY]: token,
      });
    }
  } catch {
    /* leave body unchanged */
  }
  return body;
}

/**
 * Fetch with authentication headers. Retries once on 401 with a fresh token.
 *
 * @param url - Request URL
 * @param options - Fetch options plus optional forceTokenRefresh and user
 * @returns Response (caller should check response.ok)
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const {
    headers = {},
    forceTokenRefresh = false,
    user: explicitUser,
    ...fetchOptions
  } = options;

  // Strip security-critical keys from caller headers so they cannot override auth
  const {
    Authorization: _a,
    "X-Firebase-AppCheck": _ac,
    "X-ID-Token": _id,
    "X-Firebase-ID-Token": _fid,
    ...safeCallerHeaders
  } = headers as Record<string, string>;

  const getToken = async (force: boolean) =>
    explicitUser ? explicitUser.getIdToken(force) : getIdToken(force);

  const token = await getToken(forceTokenRefresh);
  if (!token) {
    throw new Error("User not authenticated");
  }

  const appCheckHeaders = await getAppCheckHeaders();
  const contentType =
    safeCallerHeaders["Content-Type"] ??
    (typeof fetchOptions.body === "string" ? "application/json" : undefined);

  /** Merge ID token into JSON body so it survives proxies that strip all auth headers (App Hosting). */
  const bodyWithEmbeddedToken = mergeFirebaseIdTokenIntoJsonBody(
    fetchOptions.body,
    fetchOptions.method,
    contentType,
    token
  );

  const requestHeaders: Record<string, string> = {
    ...safeCallerHeaders,
    Authorization: `Bearer ${token}`,
    // Fallback for proxies that strip Authorization (Firebase App Hosting → Cloud Run)
    "X-ID-Token": token,
    "X-Firebase-ID-Token": token,
    ...appCheckHeaders,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };

  const response = await fetch(url, {
    ...fetchOptions,
    body: bodyWithEmbeddedToken,
    headers: requestHeaders,
  });

  // Retry once on 401 with a fresh token (handles expired tokens)
  // Skip retry when forceTokenRefresh was set—caller already got a fresh token; 401 likely indicates a real auth error
  if (response.status === 401 && !forceTokenRefresh) {
    const freshToken = await getToken(true);
    if (freshToken) {
      // Consume original response body before retry to avoid resource leaks (Copilot review)
      try {
        if (response.body && typeof response.body.cancel === "function") {
          await response.body.cancel();
        }
      } catch {
        /* ignore */
      }
      const retryAppCheck = await getAppCheckHeaders();
      const retryBody = mergeFirebaseIdTokenIntoJsonBody(
        fetchOptions.body,
        fetchOptions.method,
        contentType,
        freshToken
      );
      const retryHeaders: Record<string, string> = {
        ...safeCallerHeaders,
        Authorization: `Bearer ${freshToken}`,
        "X-ID-Token": freshToken,
        "X-Firebase-ID-Token": freshToken,
        ...retryAppCheck,
        ...(contentType ? { "Content-Type": contentType } : {}),
      };
      return fetch(url, {
        ...fetchOptions,
        body: retryBody,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
