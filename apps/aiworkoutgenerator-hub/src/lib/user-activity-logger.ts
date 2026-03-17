import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getDbInstance } from "@/lib/firestore";

/**
 * Type definitions for user activity logging
 * These should match the Admin Dashboard's types/firestore.ts
 */
export type UserActivityAction =
  | "workout:generate"
  | "workout:open"
  | "workout:start"
  | "workout:complete"
  | "workout:save"
  | "workout:share"
  | "profile:update"
  | "profile:onboarding_complete"
  | "recipe:view"
  | "recipe:save"
  | "subscription:upgrade"
  | "subscription:downgrade"
  | "app:open"
  | "app:session_start"
  | "app:session_end";

export type UserActivityResourceType =
  | "workout"
  | "profile"
  | "recipe"
  | "subscription"
  | "app";

export interface UserActivityLog {
  user_id: string;
  action: UserActivityAction;
  resource_type: UserActivityResourceType;
  resource_id: string | null;
  details: Record<string, unknown>;
  session_id?: string;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: ReturnType<typeof serverTimestamp>;
}

/**
 * Log a user activity event
 *
 * @param userId - Firebase Auth UID
 * @param action - Action type (e.g., 'workout:generate', 'workout:complete')
 * @param resourceType - Type of resource (e.g., 'workout', 'profile', 'app')
 * @param resourceId - ID of the resource (null for app-level actions)
 * @param details - Additional action-specific data
 * @param sessionId - Optional session identifier for grouping activities
 */
export async function logUserActivity(
  userId: string,
  action: UserActivityAction,
  resourceType: UserActivityResourceType,
  resourceId: string | null = null,
  details: Record<string, unknown> = {},
  sessionId?: string
): Promise<void> {
  try {
    // Client-side only - getDbInstance() will throw if called on server
    const db = getDbInstance();

    // Get client metadata
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : null;

    // Note: IP address detection from client-side is limited
    // Consider using a server-side endpoint or Cloud Function
    // For now, we'll leave it null and let server-side enrich if needed
    const ipAddress = null;

    await addDoc(collection(db, "user_activity_logs"), {
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      session_id: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: serverTimestamp(),
    } as Omit<UserActivityLog, "timestamp"> & {
      timestamp: ReturnType<typeof serverTimestamp>;
    });
  } catch (error) {
    // Don't block user flow - log silently
    // Activity logging should never prevent user actions
    // Note: This is separate from your app's main logger (src/lib/logger.ts)
    // Activity logging is specifically for user engagement tracking
    console.error("Failed to log user activity:", error);
  }
}
