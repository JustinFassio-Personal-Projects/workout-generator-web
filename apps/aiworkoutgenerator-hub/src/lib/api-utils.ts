import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { adminDb, getUserClaims } from "@/lib/firebase-admin";
import type { SubscriptionTier } from "@/lib/subscription-constants";
import { FIREBASE_ID_TOKEN_BODY_KEY } from "@/lib/firebase-auth-transfer-constants";

/**
 * Header used as fallback when Authorization is stripped by proxies (e.g. Firebase App Hosting).
 * Some proxies strip Authorization; X-ID-Token is typically forwarded.
 */
export const ID_TOKEN_HEADER = "X-ID-Token";

/** Second header fallback (some stacks only strip `Authorization`). */
export const FIREBASE_ID_TOKEN_HEADER = "X-Firebase-ID-Token";

/**
 * Re-export for route handlers (same string as client `authenticated-fetch`).
 */
export { FIREBASE_ID_TOKEN_BODY_KEY };

/**
 * Extract Bearer token from Authorization header, with X-ID-Token fallback.
 * Firebase App Hosting may strip the Authorization header when proxying to Cloud Run.
 * When that happens, the client sends the token in X-ID-Token; we check both.
 *
 * @param request - Next.js request object
 * @returns The token string or null if not found
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Fallback: proxy may have stripped Authorization (Firebase App Hosting / Cloud Run)
  const idTokenHeader = request.headers.get(ID_TOKEN_HEADER);
  if (idTokenHeader?.trim()) {
    return idTokenHeader.trim();
  }
  const firebaseIdHeader = request.headers.get(FIREBASE_ID_TOKEN_HEADER);
  if (firebaseIdHeader?.trim()) {
    return firebaseIdHeader.trim();
  }
  return null;
}

/**
 * Read Firebase ID token from a parsed JSON object body (last resort when headers are stripped).
 */
export function extractFirebaseIdTokenFromBody(
  body: Record<string, unknown> | null | undefined
): string | null {
  if (!body || typeof body !== "object") return null;
  const v = body[FIREBASE_ID_TOKEN_BODY_KEY];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Resolve ID token from headers first, then optional parsed JSON body.
 */
export function resolveIdToken(
  request: NextRequest,
  body?: Record<string, unknown> | null
): string | null {
  const fromHeaders = extractBearerToken(request);
  if (fromHeaders) return fromHeaders;
  return extractFirebaseIdTokenFromBody(body ?? null);
}

/**
 * Calculate SHA-256 hash of content for version integrity.
 * Used for waiver version hashing.
 *
 * @param content - The content to hash
 * @returns SHA-256 hash as hex string
 */
export function calculateVersionHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Check if a user is an admin by querying their role in Firestore.
 *
 * @param uid - User ID to check
 * @returns true if user is admin or super_admin, false otherwise
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return false;
    const role = userDoc.data()?.role;
    return role === "admin" || role === "super_admin";
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
}

/**
 * Get client IP address from request headers.
 * Handles proxies and load balancers (x-forwarded-for, x-real-ip).
 *
 * @param request - Next.js request object
 * @returns IP address string, or "unknown" if not found
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for IP (in order of preference)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to unknown if no IP found
  return "unknown";
}

/**
 * Get the user's subscription tier from custom claims.
 * Used across API routes for subscription-based rate limiting.
 *
 * @param uid - User ID to get tier for
 * @returns Subscription tier, defaults to "free" if not found or inactive
 */
export async function getUserTier(uid: string): Promise<SubscriptionTier> {
  try {
    const claims = await getUserClaims(uid);
    const tier = claims.subscription_tier as SubscriptionTier | undefined;
    const status = claims.subscription_status as string | undefined;

    // If tier is paid but status is not active, treat as free
    if (tier && tier !== "free" && status !== "active") {
      return "free";
    }

    return tier || "free";
  } catch (error) {
    console.warn("Failed to get subscription tier from claims:", error);
    return "free";
  }
}
