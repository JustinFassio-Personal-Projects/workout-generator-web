# Firebase Emulator Suite - Troubleshooting Guide

This guide helps AI Agents diagnose and resolve common issues with the Firebase Emulator Suite.

## Common Issues

### 1. Java Not Found

**Error:**

```
Error: Process `java -version` has exited with code 1. Please make sure Java is installed and on your system PATH.
```

**Solution:**

```bash
# Check if Java is installed
java -version

# If not installed (macOS):
brew install openjdk@21

# Set up Java environment
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "/usr/local/opt/openjdk@21")
export PATH="$JAVA_HOME/bin:$PATH"

# Verify
java -version
# Should show: openjdk version "21.x.x"
```

**Note:** If starting emulators in a new shell, you may need to set JAVA_HOME and PATH again, or add them to your shell profile (`~/.zshrc` or `~/.bash_profile`).

### 2. Port Already in Use

**Error:**

```
Error: Port 4000 is already in use
```

**Solution:**

```bash
# Find process using the port
lsof -ti:4000

# Kill the process
lsof -ti:4000 | xargs kill -9

# Or kill all Firebase emulator processes
pkill -f "firebase emulators"
```

**For other ports:**

```bash
# Check specific port
lsof -ti:8080  # Firestore
lsof -ti:9099  # Auth
lsof -ti:5178  # Next.js dev server

# Kill process on port
lsof -ti:PORT_NUMBER | xargs kill -9
```

### 3. Emulators Not Connecting

**Symptoms:**

- App doesn't connect to emulators
- No connection logs in browser console
- Data not persisting/loading

**Diagnosis:**

1. **Check environment variables:**

   ```bash
   # Verify .env.local exists and has emulator hosts
   cat .env.local | grep EMULATOR
   ```

   Should show:

   ```
   NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   ```

2. **Check if emulators are running:**

   ```bash
   lsof -ti:4000,8080,9099
   ```

3. **Check browser console:**
   - Look for connection logs
   - Look for error messages
   - Check Network tab for failed requests

**Solution:**

1. Ensure emulators are running: `npm run firebase:emulators`
2. Ensure `.env.local` has emulator host variables
3. **Restart Next.js dev server** (env vars are read at startup)
4. Check browser console for connection logs

### 4. Equipment/Data Not Loading

**Symptoms:**

- Equipment list empty in onboarding wizard
- Collections appear empty in Emulator UI
- "Failed to load equipment" error

**Diagnosis:**

1. **Check if data exists in emulator:**
   - Open http://localhost:4000
   - Navigate to Firestore
   - Check if `equipment_items` collection exists and has documents

2. **Check authentication:**
   - User must be authenticated to read `equipment_items` (Firestore rules)
   - Check browser console for permission errors

3. **Check if data was seeded:**
   ```bash
   # Re-seed the emulator
   npm run seed:firestore:emulator
   ```

**Solution:**

1. **Re-seed emulator data:**

   ```bash
   npm run seed:firestore:emulator
   ```

   Expected output:

   ```
   Seeding complete:
   - attempted: 32
   - written: 32
   ```

2. **Verify user is authenticated:**
   - Sign in or create account at http://localhost:3000/login
   - Check browser console for auth state

3. **Check Firestore rules:**
   - Rules require authentication to read `equipment_items`
   - Ensure user is signed in before accessing onboarding

4. **Check component logs:**
   - Open browser console
   - Look for: `[StepEquipment] Loaded X equipment items`
   - Check for error messages

### 5. Authentication Errors

**Error:**

```
Firebase: Error (auth/popup-blocked)
```

**Solution:**

- The app uses `signInWithRedirect` for Google Sign-In (better emulator compatibility)
- For testing, use email/password authentication
- Or create test users in Emulator UI: http://localhost:4000/auth

**Error:**

```
Firebase: Error (auth/network-request-failed)
```

**Solution:**

1. Check if Auth emulator is running: `lsof -ti:9099`
2. Check environment variable: `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
3. Restart Next.js dev server
4. Check browser console for connection logs

### 6. Firestore Permission Denied

**Error:**

```
FirebaseError: Missing or insufficient permissions
```

**Diagnosis:**

1. Check Firestore rules in `firestore.rules`
2. Check if user is authenticated
3. Check browser console for specific rule that failed

**Solution:**

1. **Ensure user is authenticated:**
   - Sign in at http://localhost:3000/login
   - Check browser console for auth state

2. **Check Firestore rules:**
   - Rules are in `firestore.rules`
   - `equipment_items` requires authentication: `allow read: if isAuthenticated();`
   - User must be signed in to read reference data

3. **Verify emulator has latest rules:**
   - Rules are loaded when emulators start
   - Restart emulators if rules were changed

### 7. TypeScript/Compilation Errors

**Error:**

```
Type errors in StepEquipment.tsx
```

**Solution:**

1. Run type check: `npm run type-check`
2. Fix any type errors
3. Ensure all imports are correct
4. Check if types match Firestore schema

### 8. Emulator Data Lost

**Symptoms:**

- Data disappears after restarting emulators
- Collections are empty

**Explanation:**

- **This is expected behavior** - Emulator data is ephemeral
- Data is stored in memory only
- Data is cleared when emulators stop

**Solution:**

1. Re-seed after restarting emulators:

   ```bash
   npm run seed:firestore:emulator
   ```

2. Or use Emulator UI to manually add data:
   - Open http://localhost:4000
   - Navigate to Firestore
   - Add documents manually

## Diagnostic Commands

### Check All Services Status

```bash
# Check if all required ports are in use
echo "Emulator UI: $(lsof -ti:4000 >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
echo "Firestore: $(lsof -ti:8080 >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
echo "Auth: $(lsof -ti:9099 >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
echo "Next.js Dev: $(lsof -ti:5178 >/dev/null 2>&1 && echo 'RUNNING' || echo 'NOT RUNNING')"
```

### Check Java Version

```bash
java -version
# Should show: openjdk version "21.x.x" or higher
```

### Check Environment Variables

```bash
# Check if emulator env vars are set (in Next.js context)
# Note: These are read at build time, not runtime
cat .env.local | grep EMULATOR
```

### Check Firebase Configuration

```bash
# Verify firebase.json exists and is valid
cat firebase.json | jq '.emulators'
```

### View Emulator Logs

Emulator logs are shown in the terminal where `npm run firebase:emulators` is running. Look for:

- Connection errors
- Port conflicts
- Rule loading errors
- Data import errors

## Getting Help

If issues persist:

1. **Check browser console** for detailed error messages
2. **Check emulator terminal** for server-side errors
3. **Verify all prerequisites** (Java, env vars, ports)
4. **Review system implementation** in [SYSTEM_IMPLEMENTATION.md](./SYSTEM_IMPLEMENTATION.md)
5. **Check Firestore rules** in `firestore.rules`
6. **Verify seed data** in `scripts/seed-data/`

## Quick Reset

If everything is broken, try a full reset:

```bash
# 1. Stop all processes
pkill -f "firebase emulators"
pkill -f "next dev"

# 2. Check ports are free
lsof -ti:4000,8080,9099,5178 | xargs kill -9 2>/dev/null || true

# 3. Start emulators
npm run firebase:emulators

# 4. In another terminal, start dev server
npm run dev

# 5. Seed data
npm run seed:firestore:emulator
```
