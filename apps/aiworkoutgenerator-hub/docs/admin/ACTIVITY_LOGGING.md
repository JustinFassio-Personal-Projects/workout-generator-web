# Hub App Activity Logging Guide

This guide explains how to implement user activity logging in the Hub app to track user engagement and behavior.

## Overview

The Admin Dashboard tracks user activity through the `user_activity_logs` collection in Firestore. The Hub app should log user actions to this collection to enable comprehensive activity tracking and analytics.

## Architecture

```
Hub App (Client-Side)
  ↓ [Logs events via Firebase Client SDK]
user_activity_logs Collection (Firestore)
  ↑ [Reads & Analyzes]
Admin Dashboard
```

## Implementation

### Step 1: Create Activity Logger Utility

Create a utility file in the Hub app:

**File**: `lib/user-activity-logger.ts`

```typescript
import {
  collection,
  addDoc,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { getApp } from "firebase/app";

/**
 * Get Firestore instance safely (client-side only)
 * Use this instead of direct db import to handle SSR scenarios
 */
function getFirestoreInstance(): Firestore {
  if (typeof window === "undefined") {
    throw new Error(
      "getFirestoreInstance can only be called on the client side"
    );
  }
  const app = getApp();
  return getFirestore(app);
}

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
    // Get Firestore instance (client-side only)
    const db = getFirestoreInstance();

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
```

### Step 2: Session Tracking (Optional but Recommended)

For better analytics, implement session tracking:

```typescript
// lib/session-tracker.ts
let currentSessionId: string | null = null;

export function startSession(): string {
  currentSessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return currentSessionId;
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

export function endSession(): void {
  currentSessionId = null;
}
```

### Step 3: Authentication Context

Before logging activities, you need to get the current user. Here's how to access the authenticated user:

#### Using Firebase Auth Hook

```typescript
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase'; // Your Firebase auth instance

function MyComponent() {
  const [user, loading, error] = useAuthState(auth);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Please sign in</div>;

  // Use user.uid for activity logging
  const userId = user.uid;

  // ... rest of component
}
```

#### Using Custom Auth Hook (if your app has one)

```typescript
import { useAuth } from '@/hooks/useAuth'; // Your app's auth hook

function MyComponent() {
  const { user } = useAuth();

  if (!user) return <div>Please sign in</div>;

  // Use user.uid for activity logging
  const userId = user.uid;

  // ... rest of component
}
```

### Step 4: Integration Points

Add activity logging at key user interaction points:

#### Workout Generation

```typescript
import { logUserActivity } from "@/lib/user-activity-logger";
import { useSession } from "@/lib/session-tracker";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

function WorkoutGenerator() {
  const [user] = useAuthState(auth);
  const { sessionId } = useSession();

  async function generateWorkout(workoutParams: any) {
    if (!user) throw new Error("User not authenticated");

    const userId = user.uid;
    try {
      const workout = await createWorkout(workoutParams);

      // Log activity after successful generation
      await logUserActivity(
        userId,
        "workout:generate",
        "workout",
        workout.id,
        {
          difficulty: workoutParams.difficulty,
          duration: workoutParams.duration,
          focus: workoutParams.focus,
        },
        sessionId || undefined
      );

      return workout;
    } catch (error) {
      // Handle error
      throw error;
    }
  }

  // ... rest of component
}
```

#### Workout Opening

```typescript
import { logUserActivity } from "@/lib/user-activity-logger";
import { useSession } from "@/lib/session-tracker";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

function WorkoutViewer({ workoutId }: { workoutId: string }) {
  const [user] = useAuthState(auth);
  const { sessionId } = useSession();

  useEffect(() => {
    if (!user) return;

    // Log when user views a workout
    logUserActivity(
      user.uid,
      "workout:open",
      "workout",
      workoutId,
      {},
      sessionId || undefined
    ).catch(console.error); // Fire and forget
  }, [user, workoutId, sessionId]);

  // ... rest of component
}
```

#### Workout Completion

```typescript
import { logUserActivity } from "@/lib/user-activity-logger";
import { useSession } from "@/lib/session-tracker";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

function WorkoutCompletion({ workoutId }: { workoutId: string }) {
  const [user] = useAuthState(auth);
  const { sessionId } = useSession();

  async function completeWorkout(rating?: number) {
    if (!user) throw new Error("User not authenticated");

    try {
      await markWorkoutComplete(workoutId);

      // Log completion
      await logUserActivity(
        user.uid,
        "workout:complete",
        "workout",
        workoutId,
        {
          rating: rating || null,
          completed_at: new Date().toISOString(),
        },
        sessionId || undefined
      );
    } catch (error) {
      throw error;
    }
  }

  // ... rest of component
}
```

#### Profile Updates

```typescript
import { logUserActivity } from "@/lib/user-activity-logger";
import { useSession } from "@/lib/session-tracker";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

function ProfileEditor() {
  const [user] = useAuthState(auth);
  const { sessionId } = useSession();

  async function updateProfile(profileData: Record<string, unknown>) {
    if (!user) throw new Error("User not authenticated");

    try {
      await saveProfile(profileData);

      // Log profile update
      await logUserActivity(
        user.uid,
        "profile:update",
        "profile",
        user.uid,
        {
          fields_updated: Object.keys(profileData),
        },
        sessionId || undefined
      );
    } catch (error) {
      throw error;
    }
  }

  // ... rest of component
}
```

#### App Open (Daily Active User)

```typescript
import { logUserActivity } from '@/lib/user-activity-logger';
import { SessionProvider, useSession } from '@/lib/session-tracker';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useEffect } from 'react';

// Wrap your app with SessionProvider (e.g., in _app.tsx or layout.tsx)
function AppWithSessionTracking({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionTracker />
      {children}
    </SessionProvider>
  );
}

// Component to handle session tracking
function SessionTracker() {
  const [user] = useAuthState(auth);
  const { sessionId, startSession, endSession } = useSession();

  useEffect(() => {
    if (!user) return;

    // Start session and log app open
    const newSessionId = startSession();

    // Log app open (daily active user tracking)
    logUserActivity(user.uid, 'app:open', 'app', null, {}, newSessionId).catch(
      console.error
    );

    // Log session start
    logUserActivity(
      user.uid,
      'app:session_start',
      'app',
      null,
      {},
      newSessionId
    ).catch(console.error);

    // Cleanup on unmount
    return () => {
      logUserActivity(
        user.uid,
        'app:session_end',
        'app',
        null,
        {},
        newSessionId
      ).catch(console.error);
      endSession();
    };
  }, [user, startSession, endSession]);

  return null;
}
```

#### Onboarding Completion

```typescript
import { logUserActivity } from "@/lib/user-activity-logger";
import { useSession } from "@/lib/session-tracker";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

function OnboardingFlow() {
  const [user] = useAuthState(auth);
  const { sessionId } = useSession();

  async function completeOnboarding() {
    if (!user) throw new Error("User not authenticated");

    try {
      await markOnboardingComplete(user.uid);

      // Log onboarding completion
      await logUserActivity(
        user.uid,
        "profile:onboarding_complete",
        "profile",
        user.uid,
        {
          completed_at: new Date().toISOString(),
        },
        sessionId || undefined
      );
    } catch (error) {
      throw error;
    }
  }

  // ... rest of component
}
```

## Available Actions

### Workout Actions

- `workout:generate` - User generates a new workout. When using the hub generate flow, emit a new UUID as top-level `generation_id` (and optionally mirror it in `details`) so it can be tied to later player events from that creation funnel.
- `workout:open` - User lands on a workout player surface. Use `details.surface`: `workout_player` (guided player), `simple_player` (written / one-page desktop), `mobile_player` (written mobile). For backward-compatible dashboards, simple/mobile may also set `details.surface_legacy` (`written_sheet`, `written_sheet_mobile`). Include the same `workout_attempt_id` on the document (top-level, from the logging API / client payload) and in `details` if you want redundancy. When the user arrived from a fresh generation in the same tab, also pass the same top-level `generation_id` (see **Generation funnel propagation** below).
- `workout:start` - User actually starts timing (first block timer run in the guided player, or **Start workout** on the written session). Emit **once per attempt**; correlate with `workout_attempt_id` and `session_id` from `useSession()`. Pass `generation_id` when present (same id as the preceding `workout:generate` for that funnel).
- `workout:complete` - User completes a workout; pass the same `workout_attempt_id`, optional `generation_id`, and `details.surface` when available so admin timelines can show open → start → complete and, when applicable, tie back to generate.
- `workout:save` - User saves a workout
- `workout:share` - User shares a workout

#### Correlation fields (workout funnel)

| Field | Where | Purpose |
| ----- | ----- | ------- |
| `workout_attempt_id` | Top-level on `user_activity_logs` (server route + client logger) | Stable id for one visit through a player; admin queries `where("workout_attempt_id","==", id)` for a timeline. |
| `generation_id` | Top-level on `user_activity_logs` (server route + client logger) | UUID for one **creation funnel**: same value on `workout:generate` and on `workout:open` / `workout:start` / `workout:complete` when the user continues from that generation in the same tab. Absent when the workout is opened from the library without a stored id (expected). |
| `details.surface` | Inside `details` | Which player UI produced the event. |
| `session_id` | Top-level when set | Ties to `app:session_*` and other session-scoped analytics. |

#### Generation funnel propagation (hub)

Workout details routes do not carry `generation_id` in the URL. The hub therefore stores it in **sessionStorage** keyed by workout id (`wg_generation_id:<workoutId>`) immediately after a successful generate, logs `workout:generate` with that id, and reads it in `WorkoutAnalyticsAttemptProvider` via `getGenerationIdForWorkout` (peek). After `workout:open` **persists** (`logUserActivity` resolves `true` — API `res.ok` or client Firestore `addDoc` succeeded), the hub calls `clearGenerationIdForWorkout` so a later visit to the same workout from the library does not reuse a stale id. If open logging fails (`false`), session storage is left intact so a remount or a future navigation that re-runs the player effect can retry. **React Strict Mode:** clearing runs only after a persisted open (not on peek-only mount), so a double mount still sees the same `generation_id` for open/start/complete until persistence succeeds.

**Event order (when applicable):** `workout:generate` → `workout:open` → `workout:start` → `workout:complete`, each optionally carrying the same top-level `generation_id` for that funnel.

### Profile Actions

- `profile:update` - User updates their profile
- `profile:onboarding_complete` - User completes onboarding

### Recipe Actions

- `recipe:view` - User views a recipe
- `recipe:save` - User saves a recipe

### Subscription Actions

- `subscription:upgrade` - User upgrades subscription
- `subscription:downgrade` - User downgrades subscription

### App Actions

- `app:open` - App opened (for daily active user tracking)
- `app:session_start` - User session started
- `app:session_end` - User session ended

## Best Practices

1. **Never Block User Flow**: Activity logging should be asynchronous and never prevent user actions from completing.

2. **Error Handling**: Always catch errors and log silently. Use `.catch(console.error)` for fire-and-forget logging.

3. **Session Tracking**: Use session IDs to group related activities together for better analytics.

4. **Details Object**: Include relevant context in the `details` object, but keep it lightweight.

5. **Resource IDs**: Always include `resource_id` when available (e.g., workout ID, recipe ID).

6. **App-Level Actions**: Use `resource_id: null` for app-level actions like `app:open`.

## Firestore Security Rules

The Admin Dashboard has configured Firestore security rules that allow:

- Users to create their own activity logs (with schema validation)
- Users to read their own activity logs
- Admins to read all activity logs
- No updates or deletes allowed (immutable audit trail)

**Important Security Requirements:**

- `timestamp` must use `serverTimestamp()` (client-provided timestamps are rejected)
- `user_id` must match the authenticated user's UID
- Only specific `action` and `resource_type` enum values are allowed
- Schema validation ensures only expected fields are present

The Hub app uses the Firebase Client SDK, which respects these rules. If you see permission errors, check:

1. User is authenticated
2. `user_id` matches `auth.uid`
3. `timestamp` uses `serverTimestamp()` (not `new Date()`)
4. `action` and `resource_type` are from the allowed enum values

**Example Security Rules** (configured in Admin Dashboard's `firestore.rules`):

```javascript
match /user_activity_logs/{logId} {
  allow create: if isAuthenticated() &&
                   request.resource.data.user_id == request.auth.uid &&
                   request.resource.data.timestamp == request.time &&
                   // ... schema validation ...
  allow read: if isAuthenticated() &&
                 resource.data.user_id == request.auth.uid;
  allow update, delete: if false;
}
```

## Testing

To test activity logging:

1. **Enable Firestore Emulator**: Set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`
2. **Perform Actions**: Generate workouts, complete workouts, etc.
3. **Check Firestore**: View `user_activity_logs` collection in Emulator UI
4. **Verify in Admin**: Check the Activity tab in User Details page

## Troubleshooting

### Activities Not Appearing

1. **Check Firestore Rules**: Ensure rules allow user to create logs
2. **Check User Authentication**: User must be authenticated
3. **Check Console Errors**: Look for Firestore permission errors
4. **Verify Collection Name**: Must be exactly `user_activity_logs`

### Performance Concerns

- Activity logging is asynchronous and won't impact performance
- Firestore handles batching and retries automatically
- Consider rate limiting for very high-frequency events (e.g., scroll tracking)

## Next Steps

After implementing activity logging:

1. **Verify Logging**: Check that activities appear in Admin Dashboard
2. **Monitor Usage**: Watch Firestore read/write costs
3. **Iterate**: Add more action types as needed
4. **Analytics**: Use the Admin Dashboard to analyze user engagement

## Type Definitions

The TypeScript types for `UserActivityLog` are defined in the utility file above. These types should match the Admin Dashboard's type definitions.

**Note on Type Sync:**

- The Hub app should define its own types in `src/types/firestore.ts` (or similar)
- These types should match the Admin Dashboard's `types/firestore.ts` for consistency
- Consider syncing types between repos or using a shared types package if both repos are in the same monorepo

**Key Types:**

- `UserActivityAction` - Union of all valid action strings
- `UserActivityResourceType` - Union of all valid resource types
- `UserActivityLog` - Complete log entry interface

## Relationship with Existing Logger

**Important:** Activity logging (`lib/user-activity-logger.ts`) is **separate** from your app's main logger (e.g., `src/lib/logger.ts`).

- **Main Logger**: For application debugging, error tracking, and development logs
- **Activity Logger**: For user engagement tracking and analytics (sent to Firestore)

These serve different purposes and should remain separate. Activity logging is specifically for tracking user behavior in the Admin Dashboard.

## Support

For questions or issues:

- Check Admin Dashboard documentation: `docs/USER_ACTIVITY_TRACKING.md` (in Admin repo)
- Review Firestore security rules: `firestore.rules` (in Admin repo)
- Check type definitions:
  - Hub app: `lib/user-activity-logger.ts` (types defined inline)
  - Admin repo: `types/firestore.ts` (reference for type matching)
