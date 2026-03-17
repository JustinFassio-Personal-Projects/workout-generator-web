# Shared Firebase Emulator Setup for Multi-Repo Development

When working with multiple repositories (Hub + Admin) that both use Firebase, you need to run **one shared emulator instance** that both repos connect to.

## The Problem

If you run emulators separately in each repo:

- Users created in Hub's Auth emulator don't exist in Admin's Auth emulator
- Firestore data in Hub's emulator isn't visible to Admin's Cloud Functions
- Each repo has its own isolated emulator state

## The Solution: Single Shared Emulator Instance

### Step 1: Choose Which Repo Runs Emulators

**Recommended: Run emulators from Admin repo** (since Cloud Functions run there)

```bash
# In Admin repo
firebase emulators:start
```

This starts emulators on:

- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Functions: `127.0.0.1:5002`
- UI: `http://localhost:4000`

### Step 2: Stop Emulators in Other Repos

**Stop any emulators running in Hub repo** to avoid port conflicts.

### Step 3: Configure Both Repos to Connect

#### Hub Repo Configuration (`.env.local`)

```bash
# Client-side (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080

# Server-side (for API routes)
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

#### Admin Repo Configuration

Ensure Admin repo's Cloud Functions have access to emulator environment variables:

```bash
# In Admin repo (environment or .env)
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

The Firebase Admin SDK automatically detects these and connects to emulators.

### Step 4: Create Test Users in Shared Emulator

Once emulators are running from Admin repo, create users:

```bash
# In Hub repo
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npx tsx scripts/create-pro-user.ts test@example.com test123456
```

This user will now be visible to:

- Hub repo (client-side Auth)
- Hub repo (server-side API routes)
- Admin repo (Cloud Functions)

### Step 5: Verify Connection

1. **Check Emulator UI**: `http://localhost:4000`
   - Should show Auth users, Firestore data, Functions logs

2. **Check Hub logs**: Should show:

   ```
   [Firebase] Connecting Auth emulator to http://127.0.0.1:9099
   [Firebase] Auth emulator connected successfully
   ```

3. **Check Admin logs**: Should show:
   ```
   [Firebase Admin] Using emulators:
     Auth: 127.0.0.1:9099
     Firestore: 127.0.0.1:8080
   ```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

1. Stop all emulator instances: `pkill -f "firebase emulators"`
2. Check what's using the port: `lsof -ti:9099,8080,5002`
3. Kill those processes if needed
4. Start emulators from Admin repo only

### User Not Found Errors

If Cloud Function says "User not found":

1. Verify emulators are running from Admin repo
2. Verify Admin repo has `FIREBASE_AUTH_EMULATOR_HOST` set
3. Create user in shared emulator (see Step 4)
4. Check Emulator UI to confirm user exists

### Data Not Syncing

If data created in Hub isn't visible in Admin:

1. Verify both repos are using same emulator ports
2. Verify emulators are running from one location only
3. Check Emulator UI to see all data in one place

## Alternative: Emulator Export/Import

If you need to sync data between repos:

```bash
# Export emulator data
firebase emulators:export ./emulator-data

# Import in another repo
firebase emulators:start --import=./emulator-data
```

Note: This is for one-time sync. For ongoing development, use the shared emulator approach above.
