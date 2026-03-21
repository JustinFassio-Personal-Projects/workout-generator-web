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

export type AuthenticatedFetchOptions = Omit<RequestInit, "headers"> & {
  /** Optional custom headers merged with auth headers */
  headers?: Record<string, string>;
  /** If true, force token refresh before the request (e.g., after 401 retry) */
  forceTokenRefresh?: boolean;
  /** When provided, use this user's token instead of auth.currentUser (avoids timing mismatches) */
  user?: User;
};

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

  // Strip security-critical keys from caller headers so they cannot override auth (Copilot review)
  const {
    Authorization: _a,
    "X-Firebase-AppCheck": _ac,
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

  const requestHeaders: Record<string, string> = {
    ...safeCallerHeaders,
    Authorization: `Bearer ${token}`,
    ...appCheckHeaders,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
  });

  // Retry once on 401 with a fresh token (handles expired tokens)
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
      const retryHeaders: Record<string, string> = {
        ...safeCallerHeaders,
        Authorization: `Bearer ${freshToken}`,
        ...retryAppCheck,
        ...(contentType ? { "Content-Type": contentType } : {}),
      };
      return fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
