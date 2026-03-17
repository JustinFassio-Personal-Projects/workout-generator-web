# Firebase Emulator Suite - Quick Start Guide

This guide provides instructions for AI Agents on how to start and manage the Firebase Emulator Suite for local development.

## Overview

The Firebase Emulator Suite provides local emulators for:

- **Auth Emulator** (port 9099) - User authentication
- **Firestore Emulator** (port 8080) - Database
- **Functions Emulator** (port 5002) - Cloud Functions (workout generation)
- **Emulator UI** (port 4000) - Web interface for managing emulators
- **Hosting Emulator** (port 5001) - Static file hosting (not used in development)

The Next.js dev server runs on **port 5178** and connects to these emulators.

## Prerequisites

### 1. Java Runtime (Required)

Firebase emulators require Java 21 or higher.

**Check if Java is installed:**

```bash
java -version
```

**If Java is not installed (macOS):**

```bash
# Install Java 21 via Homebrew
brew install openjdk@21

# Set up Java environment (add to shell session)
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/usr/local/opt/openjdk@21")
export PATH="$JAVA_HOME/bin:$PATH"
```

**Note:** If Java is not in PATH, you'll need to set these environment variables before starting emulators.

### 2. Environment Variables

Ensure `.env.local` contains:

```bash
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5002
```

These variables tell the Next.js app to connect to the local emulators instead of production Firebase.

## Starting the Emulator Suite

### Step 1: Start Firebase Emulators

```bash
npm run firebase:emulators
```

This command:

- Starts all configured emulators (Auth, Firestore, Functions, UI)
- Loads Firestore security rules from `firestore.rules`
- Loads Firestore indexes from `firestore.indexes.json`
- Opens the Emulator UI at http://localhost:4000

**Expected output:**

```
✔  All emulators ready! It is now safe to connect.
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect.         │
│ i  View Emulator UI at http://localhost:4000                │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Start Next.js Dev Server

In a **separate terminal** (or background process):

```bash
npm run dev
```

This starts the Next.js development server on port 5178.

**Important:** The dev server must be restarted after setting/changing emulator environment variables for them to take effect.

### Step 3: Seed Initial Data

After emulators are running, seed the Firestore emulator with initial data:

```bash
npm run seed:firestore:emulator
```

This populates:

- `equipment_items` collection
- `workout_focuses` collection
- `workout_types` collection
- `equipment` collection

**Note:** Emulator data is **ephemeral** - it's cleared when emulators stop. Re-seed after restarting emulators.

## Verification

### Check if Emulators are Running

```bash
# Check all required ports
lsof -ti:4000,8080,9099,5002,5178 2>/dev/null | wc -l
# Should return: 5
```

Or check individually:

```bash
lsof -ti:4000  # Emulator UI
lsof -ti:8080  # Firestore
lsof -ti:9099  # Auth
lsof -ti:5002  # Functions
lsof -ti:5178  # Next.js dev server
```

### Verify Emulator Connection

1. **Open browser console** (F12 or Cmd+Option+I) at http://localhost:3000
2. **Look for connection logs:**

   ```
   [Firebase] Connecting Auth emulator to http://127.0.0.1:9099
   [Firebase] Auth emulator connected successfully
   [Firestore] Connecting Firestore emulator to 127.0.0.1:8080
   [Firestore] Firestore emulator connected successfully
   ```

3. **Check Emulator UI:** http://localhost:4000
   - Should show Auth, Firestore, and Functions emulators
   - Should show seeded collections

## Access URLs

- **App:** http://localhost:3000
- **Emulator UI:** http://localhost:4000
- **Auth Emulator:** http://localhost:9099 (direct access not needed)
- **Firestore Emulator:** http://localhost:8080 (direct access not needed)
- **Functions Emulator:** http://localhost:5002 (direct access not needed)

## Important Notes

1. **Port 5178 vs Port 5001:**
   - Port 5178 = Next.js dev server (connects to emulators) ✅ **Use this**
   - Port 5001 = Firebase Hosting emulator (static build, no emulator connection) ❌ **Don't use**

2. **Data Persistence:**
   - Emulator data is **not persisted** between restarts
   - Always re-seed after restarting emulators
   - Use Emulator UI to manually add test data if needed

3. **Authentication:**
   - Users created in the emulator are local only
   - Use Emulator UI (http://localhost:4000/auth) to create test users
   - Or use the app's sign-up flow (creates users in emulator)

4. **Environment Variables:**
   - Must be set in `.env.local`
   - Next.js dev server must be restarted after changing env vars
   - Variables are read at build/start time, not runtime

## Quick Reference Commands

```bash
# Start emulators
npm run firebase:emulators

# Start dev server (separate terminal)
npm run dev

# Seed emulator data
npm run seed:firestore:emulator

# Check if ports are in use
lsof -ti:4000,8080,9099,5002,5178

# Stop emulators
# Press Ctrl+C in the emulator terminal, or:
pkill -f "firebase emulators"
```

## Next Steps

- See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- See [SYSTEM_IMPLEMENTATION.md](./SYSTEM_IMPLEMENTATION.md) for technical details
