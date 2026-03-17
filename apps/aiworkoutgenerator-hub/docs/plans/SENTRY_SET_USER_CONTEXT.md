# Wire Up setUserContext for Per-User Error History

## Goal

Call Sentry’s `setUserContext(uid)` after auth verification and `clearUserContext()` on sign-out so that all subsequent client-side errors are associated with the current user, enabling per-user error history in Sentry.

## Current state

- **Sentry helpers:** [src/lib/sentry.ts](src/lib/sentry.ts) already exports `setUserContext(userId, traits?)` and `clearUserContext()`. They call `Sentry.setUser(...)` / `Sentry.setUser(null)` and are no-ops when Sentry is not configured.
- **Auth:** [src/components/auth/AuthProvider.tsx](src/components/auth/AuthProvider.tsx) is the single place where auth state is established on the client. It uses `onAuthStateChanged`; in the callback it receives `user` (Firebase `User` or `null`) and updates state. It does not currently call any Sentry APIs.
- **Layout:** [src/app/layout.tsx](src/app/layout.tsx) wraps the app with `AuthProvider`, so every client-rendered page runs after auth is resolved.

`setUserContext` and `clearUserContext` are not called anywhere in the app today.

## Implementation

### 1. Call setUserContext / clearUserContext in AuthProvider

**File:** [src/components/auth/AuthProvider.tsx](src/components/auth/AuthProvider.tsx)

- **Import:** Add `setUserContext` and `clearUserContext` from `@/lib/sentry`.
- **On sign-in:** In the `onAuthStateChanged` callback, when `user` is truthy, call `setUserContext(user.uid)` so that all later client-side errors and events are associated with that user. Place this immediately after `setUser(user)` and `setLoading(false)` (e.g. right after line 42), so it runs on every auth state change where a user is present.
- **On sign-out:** When `user` is null, call `clearUserContext()`. The existing `else if (!user)` block (lines 85–89) already resets `lastLoginUpdatedForRef.current = null`; add `clearUserContext()` there so that after sign-out, errors are no longer tagged with a user.

**Suggested code shape (conceptual):**

- In the success callback: after `setUser(user); setLoading(false);`, add:
  - `if (user) { setUserContext(user.uid); } else { clearUserContext(); }`
- No need to pass `traits.tier` unless the AuthProvider later has access to subscription tier (e.g. from a hook or Firestore); that can be a follow-up.

### 2. Optional: document in SWOT

**File:** [docs/SENTRY_IMPLEMENTATION_SWOT.md](docs/SENTRY_IMPLEMENTATION_SWOT.md)

- In the Summary or Strengths, add a short note that Sentry user context is set in the client after auth (`setUserContext(uid)` in AuthProvider) and cleared on sign-out (`clearUserContext()`), enabling per-user error history in Sentry.

## Flow

```mermaid
sequenceDiagram
  participant Browser
  participant AuthProvider
  participant FirebaseAuth
  participant Sentry

  Browser->>AuthProvider: Mount
  AuthProvider->>FirebaseAuth: onAuthStateChanged()
  FirebaseAuth-->>AuthProvider: user or null

  alt user signed in
    AuthProvider->>AuthProvider: setUser(user); setLoading(false)
    AuthProvider->>Sentry: setUserContext(user.uid)
    Note over Sentry: Subsequent errors tagged with user id
  else user signed out
    AuthProvider->>AuthProvider: setUser(null); reset ref
    AuthProvider->>Sentry: clearUserContext()
    Note over Sentry: Errors no longer tagged with user
  end
```

## Verification

- Sign in in the app, then trigger a client-side error (e.g. throw in a component or use the Sentry example page if present). In Sentry, confirm the event has the correct user id.
- Sign out, trigger another client-side error, and confirm the event has no user (or previous user is cleared).
- Ensure no new linter or TypeScript errors in AuthProvider.

## Notes

- **Server-side:** API routes already pass `userId` into `captureApiError` when available; they do not use the global Sentry user scope. This change only affects client-side scope; per-request server context is unchanged.
- **PII:** `setUserContext` sends only the Firebase UID (non-PII); no email or name is set here.
- **Tier:** Passing `traits: { tier }` can be added later if AuthProvider or a child has access to subscription tier (e.g. from Firestore or a hook) without adding extra reads solely for Sentry.
