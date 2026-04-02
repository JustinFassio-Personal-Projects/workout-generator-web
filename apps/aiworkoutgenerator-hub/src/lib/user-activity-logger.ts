import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { devLogError } from "@/lib/devLog";
import { getAuthInstance } from "@/lib/firebase";
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

/** Max length for client-supplied workout_attempt_id (UUID v4 = 36 chars). */
export const WORKOUT_ATTEMPT_ID_MAX_LEN = 64;

export interface UserActivityLog {
  user_id: string;
  action: UserActivityAction;
  resource_type: UserActivityResourceType;
  resource_id: string | null;
  details: Record<string, unknown>;
  session_id?: string;
  /** Correlates open → start → complete for one player visit (admin journey queries). */
  workout_attempt_id?: string;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: ReturnType<typeof serverTimestamp>;
}

/** Optional 6th argument to logUserActivity (replaces legacy sessionId-only string). */
export type LogUserActivityExtras = {
  sessionId?: string;
  workoutAttemptId?: string;
  authUser?: User | null;
};

function normalizeLogExtras(
  sessionOrExtras?: string | LogUserActivityExtras,
  legacyAuthUser?: User | null
): {
  sessionId?: string;
  workoutAttemptId?: string;
  authUser?: User | null;
} {
  if (sessionOrExtras === undefined) {
    return { authUser: legacyAuthUser };
  }
  if (typeof sessionOrExtras === "string") {
    return { sessionId: sessionOrExtras, authUser: legacyAuthUser };
  }
  return {
    sessionId: sessionOrExtras.sessionId,
    workoutAttemptId: sessionOrExtras.workoutAttemptId,
    authUser:
      sessionOrExtras.authUser !== undefined
        ? sessionOrExtras.authUser
        : legacyAuthUser,
  };
}

/**
 * Log a user activity event
 *
 * @param userId - Firebase Auth UID
 * @param action - Action type (e.g., 'workout:generate', 'workout:complete')
 * @param resourceType - Type of resource (e.g., 'workout', 'profile', 'app')
 * @param resourceId - ID of the resource (null for app-level actions)
 * @param details - Additional action-specific data
 * @param sessionOrExtras - Session id string, or `{ sessionId, workoutAttemptId, authUser }`
 * @param legacyAuthUser - Only used when 6th arg is a string (backward compatible)
 */
export async function logUserActivity(
  userId: string,
  action: UserActivityAction,
  resourceType: UserActivityResourceType,
  resourceId: string | null = null,
  details: Record<string, unknown> = {},
  sessionOrExtras?: string | LogUserActivityExtras,
  legacyAuthUser?: User | null
): Promise<void> {
  const { sessionId, workoutAttemptId, authUser } = normalizeLogExtras(
    sessionOrExtras,
    legacyAuthUser
  );
  try {
    const currentUser = authUser ?? getAuthInstance().currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return;
    }

    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : null;

    const workoutAttemptPayload =
      workoutAttemptId !== undefined &&
      workoutAttemptId.length > 0 &&
      workoutAttemptId.length <= WORKOUT_ATTEMPT_ID_MAX_LEN
        ? { workout_attempt_id: workoutAttemptId }
        : {};

    try {
      const res = await authenticatedFetch("/api/analytics/log-activity", {
        method: "POST",
        body: JSON.stringify({
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          ...(sessionId !== undefined ? { session_id: sessionId } : {}),
          ...workoutAttemptPayload,
          user_agent: userAgent,
        }),
        headers: { "Content-Type": "application/json" },
        user: currentUser,
      });
      if (res.ok) {
        return;
      }
    } catch {
      /* fall through to client Firestore */
    }

    const db = getDbInstance();
    await currentUser.getIdToken();

    const ipAddress = null;

    const payload = {
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ...(sessionId !== undefined ? { session_id: sessionId } : {}),
      ...workoutAttemptPayload,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: serverTimestamp(),
    } as Omit<UserActivityLog, "timestamp"> & {
      timestamp: ReturnType<typeof serverTimestamp>;
    };

    const writeOnce = () =>
      addDoc(collection(db, "user_activity_logs"), payload);

    try {
      await writeOnce();
    } catch (firstError: unknown) {
      const code =
        firstError && typeof firstError === "object" && "code" in firstError
          ? String((firstError as { code?: string }).code)
          : "";
      if (code === "permission-denied") {
        await currentUser.getIdToken(true);
        await new Promise((r) => setTimeout(r, 150));
        await writeOnce();
      } else {
        throw firstError;
      }
    }
  } catch (error) {
    devLogError("logUserActivity", error);
  }
}
