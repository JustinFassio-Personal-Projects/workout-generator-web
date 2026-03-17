# Firebase Emulator Suite - System Implementation

This document describes the technical implementation of the Firebase Emulator Suite integration in this project.

## Architecture Overview

```
┌─────────────────┐
│  Next.js App    │
│  (Port 5178)    │
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Auth Emulator│  │Firestore     │  │ Emulator UI  │
│ (Port 9099)  │  │Emulator      │  │ (Port 4000)  │
│              │  │(Port 8080)   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Configuration Files

### firebase.json

Defines emulator configuration:

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5001 },
    "ui": { "enabled": true, "port": 4000 }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### Environment Variables (.env.local)

Required for app to connect to emulators:

```bash
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

**Important:**

- Variables must start with `NEXT_PUBLIC_` to be accessible in the browser
- Format: `host:port` (no protocol prefix)
- App must be restarted after changing these variables

## Implementation Details

### Firebase Initialization (`src/lib/firebase.ts`)

**Key Functions:**

1. **`maybeConnectAuthEmulator(authInstance: Auth)`**
   - Checks for `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`
   - Connects Auth instance to emulator
   - Must be called before any auth operations
   - Uses `connectAuthEmulator()` from `firebase/auth`

2. **Initialization Flow:**

   ```typescript
   if (typeof window !== "undefined") {
     app = initializeApp(firebaseConfig);
     auth = getAuth(app);
     maybeConnectAuthEmulator(auth); // Connect to emulator
   }
   ```

3. **Connection Logging:**
   - Logs connection attempts to console
   - Warns if emulator not configured
   - Errors are caught but don't crash the app

### Firestore Initialization (`src/lib/firestore.ts`)

**Key Functions:**

1. **`getDbInstance(): Firestore`**
   - Client-only function (throws if called server-side)
   - Lazy initialization of Firestore instance
   - Connects to emulator on first call

2. **Emulator Connection:**

   ```typescript
   const hostPort =
     process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim() ?? "";
   if (hostPort && !firestoreEmulatorConnected) {
     const [host, portStr] = hostPort.split(":");
     const port = Number(portStr);
     connectFirestoreEmulator(db, host, port);
   }
   ```

3. **Connection State:**
   - Uses `firestoreEmulatorConnected` flag to prevent duplicate connections
   - Logs connection status to console
   - Validates host:port format

## Authentication Flow

### Emulator Connection

1. **App Startup:**
   - `firebase.ts` initializes Firebase app
   - Checks for `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`
   - Connects Auth to emulator if variable is set

2. **User Authentication:**
   - Users created in emulator are stored locally
   - Auth state persists during emulator session
   - Auth state is cleared when emulator stops

3. **Google Sign-In:**
   - Uses `signInWithRedirect()` (not `signInWithPopup()`)
   - Better emulator compatibility
   - Redirect result handled in `AuthForm.tsx`

### Firestore Rules

Rules are defined in `firestore.rules` and loaded when emulators start.

**Key Rules:**

- `equipment_items`: `allow read: if isAuthenticated();`
- `workout_focuses`: `allow read: if isAuthenticated();`
- `user_profiles`: `allow read: if isOwner(userId);`

**Important:** Reference data collections require authentication to read.

## Data Seeding

### Seed Script (`scripts/seed-firestore-schema.ts`)

**Purpose:** Populate emulator with initial reference data

**Usage:**

```bash
npm run seed:firestore:emulator
```

**Process:**

1. Reads JSON files from `scripts/seed-data/`
2. Connects to Firestore (emulator or production)
3. Upserts documents using batch writes
4. Adds timestamps (`created_at`, `updated_at`)

**Collections Seeded:**

- `equipment_items` - Equipment available for workouts
- `workout_focuses` - Types of workout focuses
- `workout_types` - Types of workouts
- `equipment` - Legacy equipment collection

**Data Format:**

- Seed files are JSON arrays
- Each item must have `id` and `name` fields
- Additional fields are preserved via spread operator

### Data Persistence

**Emulator Data:**

- Stored in memory only
- Cleared when emulators stop
- Must be re-seeded after restart

**Production Data:**

- Persisted in Firebase project
- Seeded via: `npm run seed:firestore:prod`
- Requires `--confirm-production` flag

## Component Integration

### StepEquipment Component

**Implementation:**

- Uses `useUser()` hook to check authentication
- Waits for user to be authenticated before querying
- Queries `equipment_items` with `orderBy("display_order", "asc")`
- Handles loading and error states

**Key Code:**

```typescript
useEffect(() => {
  // Don't attempt to load equipment if user is not authenticated yet
  if (authLoading || !user) {
    setLoading(true);
    return;
  }

  let active = true;
  // Use IIFE pattern since useEffect callbacks cannot be async
  (async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getDbInstance();
      const q = query(
        collection(db, "equipment_items"),
        orderBy("display_order", "asc")
      );
      const snap = await getDocs(q);

      if (!active) return;

      const list: EquipmentItem[] = snap.docs.map((d) => {
        const data = d.data() as unknown as Omit<EquipmentItem, "id">;
        return { id: d.id, ...data };
      });

      if (active) {
        setItems(list);
      }
    } catch (e: unknown) {
      if (active) {
        setError(e instanceof Error ? e.message : "Failed to load equipment");
      }
    } finally {
      if (active) setLoading(false);
    }
  })();

  return () => {
    active = false;
  };
}, [user, authLoading]);
```

**Why Authentication Check:**

- Firestore rules require authentication
- Query fails if user not authenticated
- Component shows loading state until authenticated

## Port Configuration

| Service            | Port | Purpose                              |
| ------------------ | ---- | ------------------------------------ |
| Next.js Dev Server | 5178 | Main app (connects to emulators)     |
| Emulator UI        | 4000 | Web interface for managing emulators |
| Firestore Emulator | 8080 | Database emulator                    |
| Auth Emulator      | 9099 | Authentication emulator              |
| Hosting Emulator   | 5001 | Static file hosting (not used)       |

**Note:** Port 5001 (Hosting) is not used in development. Always use port 5178 for the app.

## Environment Detection

### Emulator Detection

Components can detect if emulators are being used:

```typescript
const isUsingEmulator = !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
```

**Use Cases:**

- Show different UI messages
- Use different authentication flows
- Display emulator-specific warnings

### Connection Logging

Both `firebase.ts` and `firestore.ts` log connection status:

**Success:**

```
[Firebase] Connecting Auth emulator to http://127.0.0.1:9099
[Firebase] Auth emulator connected successfully
[Firestore] Connecting Firestore emulator to 127.0.0.1:8080
[Firestore] Firestore emulator connected successfully
```

**Failure:**

```
[Firebase] Auth emulator not configured. Set NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST to connect to emulator.
```

## Error Handling

### Connection Errors

- Errors are logged but don't crash the app
- App continues to work but won't connect to emulators
- User sees production Firebase (if configured)

### Query Errors

- Components catch and display errors
- Errors logged to console with context
- User sees error messages in UI

### Authentication Errors

- Handled in `AuthProvider.tsx`
- Emulator-specific errors are suppressed (expected behavior)
- Other errors are logged and displayed

## Security Considerations

### Firestore Rules

- Rules are enforced in emulator
- Same rules as production (from `firestore.rules`)
- Test rules changes locally before deploying

### Authentication

- Emulator users are local only
- No connection to production Firebase
- Safe to test authentication flows

### Data Isolation

- Emulator data is completely isolated
- No risk of affecting production data
- Safe to test destructive operations

## Performance Considerations

### Connection Overhead

- Emulator connections are established once
- Connection state is cached
- Minimal performance impact

### Query Performance

- Emulator queries are fast (in-memory)
- No network latency
- Suitable for development/testing

## Best Practices

1. **Always seed after restart:** Emulator data is ephemeral
2. **Check authentication:** Components should wait for auth before querying
3. **Use Emulator UI:** Great for debugging and manual data entry
4. **Test rules locally:** Verify Firestore rules before deploying
5. **Monitor console logs:** Connection status and errors are logged

## Debugging Tips

1. **Check browser console** for connection logs
2. **Check emulator terminal** for server-side errors
3. **Use Emulator UI** to inspect data and auth state
4. **Verify environment variables** are set correctly
5. **Restart dev server** after changing env vars

## Related Files

- `firebase.json` - Emulator configuration
- `firestore.rules` - Security rules
- `src/lib/firebase.ts` - Firebase initialization
- `src/lib/firestore.ts` - Firestore initialization
- `scripts/seed-firestore-schema.ts` - Data seeding script
- `src/components/onboarding/steps/StepEquipment.tsx` - Example component using emulators
