# Parent-Child App Architecture with Shared Supabase Database

## Overview

This document outlines the recommended architecture for sharing a Supabase database between a parent app and this child trainer app, while maintaining the ability to develop each app independently.

## The Challenge

- **Parent App**: Aggregates client data, stores persistent data (workout dates, frequency, profile data, programs)
- **Child App (Trainer)**: Specialized workflow for generating workouts, developed independently
- **Problem**: Child app needs database access but doesn't receive auth tokens when developed standalone

## Recommended Solution: Multi-Mode Authentication

We've implemented a flexible authentication system that supports **three modes**:

### 1. Development Mode

**Use this for independent development of the Trainer app**

- Requires authentication - no unauthenticated access allowed
- Developers can create test users in Supabase and sign in normally
- Full database access with proper Row-Level Security (RLS)
- All routes are protected and require valid authentication

**Setup:**

```bash
# 1. Create a test user in Supabase Dashboard → Authentication → Users
# 2. Sign in through the /account route using test user credentials
# 3. Or use SSO tokens from Hub app for testing SSO flow
```

**Important:**

- ✅ Authentication is always required - no bypass or fallback
- ✅ Real authentication ensures RLS policies protect data properly
- ✅ Mimics production auth flow exactly
- ✅ No seed/test data displayed - users see empty state until profile is set up

### 2. EMBEDDED Mode (Production - Different Domains)

**Use this when parent and child apps are on different domains**

- Hub generates SSO token and stores in database
- Hub redirects to child app with token in URL
- Child app exchanges token via RPC function and establishes session
- Schema-based SSO (no postMessage needed)

**Hub App Code:**

```typescript
// Generate SSO token and store in sso_tokens table
const token = await generateSSOToken(userId, 'trainer');

// Redirect to Trainer app with token in URL
window.location.href = `https://trainer.example.com/?sso_token=${token}`;
```

**Trainer App Code:**

```typescript
// Uses useSchemaBasedSSO hook (automatically handles token exchange)
const { user, session, isLoading, error } = useSchemaBasedSSO(supabase);
```

````

**Child App Configuration:**

```bash
VITE_AUTH_MODE=EMBEDDED
````

### 3. SHARED_SESSION Mode (Production - Same Domain)

**Use this when parent and child apps share the same domain**

- Both apps use the same Supabase client
- Session stored in localStorage is shared automatically
- Simplest integration approach

**Configuration:**

```bash
VITE_AUTH_MODE=SHARED_SESSION
```

**Example:**

- Parent: `https://app.example.com`
- Child: `https://app.example.com/trainer`
- Both share localStorage → both see the same session

## Database Architecture

### Shared Tables

All tables use Row-Level Security (RLS) to ensure users can only access their own data:

#### profiles

```sql
- id (UUID, Primary Key) → matches auth.users.id
- age, gender, weight, height, units
- fitness_level, goals, injuries, medical_conditions, preferences
- updated_at
```

**RLS Policies:**

```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

#### workouts

```sql
- id (UUID, Primary Key)
- user_id (UUID) → Foreign Key to auth.users.id
- title, description, difficulty, trainer_notes
- total_duration, estimated_calories
- trainer_type, focus, exercises
- created_at
```

**RLS Policies:**

```sql
-- Users can only access their own workouts
CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  USING (auth.uid() = user_id);
```

#### workout_exercises

```sql
- workout_id (UUID) → Foreign Key to workouts.id
- section_type, name, muscle_target
- sets_count, tempo, cues, set_details
```

**RLS Policies:**

```sql
-- Users can only access exercises for their own workouts
CREATE POLICY "Users can view own workout exercises"
  ON workout_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
      AND workouts.user_id = auth.uid()
    )
  );
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Parent App                           │
│  - User authentication                                      │
│  - Workout scheduling                                       │
│  - Program management                                       │
│  - Analytics & tracking                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ (shares auth session)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Shared Supabase DB                       │
│  Tables: profiles, workouts, workout_exercises              │
│  RLS: ✅ Enabled on all tables                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ (reads/writes with user auth)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     Trainer App (Child)                     │
│  - Profile setup                                            │
│  - Workout generation (AI-powered)                          │
│  - Workout history                                          │
│  - Active workout display                                   │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

### 1. Row-Level Security (RLS) - CRITICAL ✅

**MUST ENABLE on all tables:**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
```

**Why?** RLS ensures users can only access their own data, even if:

- The child app is developed independently
- Dev tokens are accidentally exposed
- Multiple users share the same database

### 2. Environment Variables

**Never commit to git:**

```gitignore
*.local          # Covers .env.local
.env
.env.development
```

**Production checklist:**

- ✅ Use environment variables, never hardcode credentials
- ✅ Rotate tokens regularly
- ✅ Use different Supabase projects for dev/staging/production
- ✅ Use schema-based SSO for cross-domain authentication
- ✅ Enable MFA for Supabase dashboard access

### 3. Auth Token Best Practices

**Development:**

- Use STANDALONE_DEV with test user tokens
- Tokens stored in `.env.local` (gitignored)
- Regenerate tokens if compromised

**Production:**

- Use SHARED_SESSION (same domain) or EMBEDDED (different domains)
- Never use STANDALONE_DEV in production
- Implement token refresh logic for long-lived sessions

## Authentication Detection

The Trainer app supports two authentication methods:

1. **Direct Sign-In**: Users sign in directly through the `/account` route using email/password
2. **SSO from Hub**: Users authenticate through the Hub app and receive SSO tokens via URL (schema-based SSO)

The app automatically handles both flows:

- SSO tokens are received via `useSchemaBasedSSO` hook (`services/SchemaBasedSSO.ts`)
- Direct sign-in uses the `useAuth` hook (`hooks/useAuth.ts`)
- Both methods establish a Supabase session using `supabase.auth.setSession()`

**Note:** The app requires authentication for all protected routes. There is no "standalone dev mode" - developers must authenticate using one of the two methods above.

## Development Workflow

### Scenario 1: Developing Child App Independently

```bash
# 1. Create test user in Supabase
# Dashboard → Authentication → Users → Add user

# 2. Generate dev tokens
npx tsx scripts/generate-dev-tokens.ts

# 3. Copy output to .env.local
# VITE_DEV_ACCESS_TOKEN=...
# VITE_DEV_REFRESH_TOKEN=...

# 4. Start dev server
npm run dev

# ✅ App runs in STANDALONE_DEV mode with full database access
```

### Scenario 2: Developing Both Apps Together

#### Option A: Same Domain (Simplest)

```bash
# Parent runs on: http://localhost:3000
# Child runs on: http://localhost:3000/trainer (via reverse proxy)

# Both apps share localStorage → auto-authenticated
# Child app: VITE_AUTH_MODE=SHARED_SESSION
```

#### Option B: Different Domains

```bash
# Parent runs on: http://localhost:3000
# Child runs on: http://localhost:5173

# Parent sends auth via postMessage to child iframe
# Child app: VITE_AUTH_MODE=EMBEDDED
```

### Scenario 3: Production Deployment

#### Same Domain (Recommended)

```
https://app.example.com          → Parent app
https://app.example.com/trainer  → Child app (served as iframe or route)

# Both apps use SHARED_SESSION mode
# User logs in once → both apps authenticated
```

#### Different Domains

**Example (Production):**

```
https://www.generateworkout.app/fitcopilot-trainer  → Hub app (embeds Trainer iframe)
https://fitcopilot-trainer.vercel.app               → Trainer app (standalone)

# Trainer app uses schema-based SSO
# Hub redirects with SSO token in URL
```

**Example (Development):**

```
http://localhost:3000          → Parent app
http://localhost:5173          → Trainer app

# Trainer app uses schema-based SSO
# Hub redirects with SSO token in URL
```

## Alternatives Considered

### ❌ Service Role Key (Not Recommended)

**Approach:** Use Supabase service role key in child app to bypass RLS

**Problems:**

- Exposes service role key in client code (security risk)
- Bypasses all RLS protections
- Would allow child app to access ALL user data
- Violates principle of least privilege

**Verdict:** Never do this

### ❌ Separate Databases (Not Recommended for This Use Case)

**Approach:** Child app uses its own database, sync data to parent

**Problems:**

- Requires complex data synchronization logic
- Data consistency issues (what's the source of truth?)
- Duplicate storage costs
- Harder to maintain referential integrity
- Doesn't align with your goal of sharing data

**Verdict:** Adds unnecessary complexity for this use case

### ✅ Shared Database with Multi-Mode Auth (RECOMMENDED)

**Approach:** Same Supabase project, flexible auth modes, RLS protection

**Benefits:**

- ✅ Single source of truth for all data
- ✅ Develop child app independently with STANDALONE_DEV
- ✅ Easy integration with parent app (EMBEDDED or SHARED_SESSION)
- ✅ Proper security with RLS
- ✅ No data synchronization needed
- ✅ Lower costs (single database)

**Verdict:** Best approach for parent-child architecture

## Migration Guide

If you want to migrate from current setup to new auth system:

### Step 1: Set Up RLS Policies

```bash
# See docs/AUTH_SETUP.md for complete RLS policy SQL
```

### Step 2: Create Test User

```bash
# Supabase Dashboard → Authentication → Users → Add user
# Email: test@example.com
# Password: [secure password]
# ✅ Auto Confirm User
```

### Step 3: Generate Dev Tokens

```bash
npx tsx scripts/generate-dev-tokens.ts
# Copy output to .env.local
```

### Step 4: Update App Code

✅ Already done! Your App.tsx now uses the new auth service.

### Step 5: Test

```bash
npm run dev

# You should see:
# 🔐 Auto-detected auth mode: STANDALONE_DEV
# ✅ Dev session established for user: [test-user-id]
```

## Troubleshooting

### "No dev session tokens found"

**Solution:** Run `npx tsx scripts/generate-dev-tokens.ts` and add tokens to `.env.local`

### "Row-level security policy violation"

**Solution:**

1. Enable RLS on tables
2. Create RLS policies (see docs/AUTH_SETUP.md)
3. Verify user is authenticated

### "Token expired"

**Solution:** Re-run `npx tsx scripts/generate-dev-tokens.ts` to get fresh tokens

### Child app stuck on "Initializing..."

**Solution:**

- Check browser console for auth errors
- Verify dev tokens are in `.env.local`
- Restart dev server after adding tokens

## Further Reading

- [AUTH_SETUP.md](./AUTH_SETUP.md) - Detailed setup instructions and RLS policies
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

## Summary

**For Independent Development:**

- ✅ Use STANDALONE_DEV mode with test user tokens
- ✅ Run `scripts/generate-dev-tokens.ts` to get started
- ✅ Develop child app without parent app running

**For Production Integration:**

- ✅ Use SHARED_SESSION mode (same domain) - simplest
- ✅ Use schema-based SSO (different domains) - URL-based token exchange
- ✅ Always enable RLS on all tables
- ✅ Never use STANDALONE_DEV in production

**Key Principle:**
The child app is a **specialized workflow**, not a completely separate application. It shares the same database and user authentication, but can be developed independently using proper auth modes. This gives you the best of both worlds: independent development and seamless integration.
