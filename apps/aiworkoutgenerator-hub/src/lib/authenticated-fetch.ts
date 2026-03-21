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

import { getIdToken } from "@/lib/auth";
import { getAppCheckHeaders } from "@/lib/firebase";

export type AuthenticatedFetchOptions = Omit<RequestInit, "headers"> & {
  /** Optional custom headers merged with auth headers */
  headers?: Record<string, string>;
  /** If true, force token refresh before the request (e.g., after 401 retry) */
  forceTokenRefresh?: boolean;
};

/**
 * Fetch with authentication headers. Retries once on 401 with a fresh token.
 *
 * @param url - Request URL
 * @param options - Fetch options plus optional forceTokenRefresh
 * @returns Response (caller should check response.ok)
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { headers = {}, forceTokenRefresh = false, ...fetchOptions } = options;

  const token = await getIdToken(forceTokenRefresh);
  if (!token) {
    throw new Error("User not authenticated");
  }

  const appCheckHeaders = await getAppCheckHeaders();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...appCheckHeaders,
    ...headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers: requestHeaders,
  });

  // Retry once on 401 with a fresh token (handles expired tokens)
  if (response.status === 401 && !forceTokenRefresh) {
    const freshToken = await getIdToken(true);
    if (freshToken) {
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freshToken}`,
        ...(await getAppCheckHeaders()),
        ...headers,
      };
      return fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
