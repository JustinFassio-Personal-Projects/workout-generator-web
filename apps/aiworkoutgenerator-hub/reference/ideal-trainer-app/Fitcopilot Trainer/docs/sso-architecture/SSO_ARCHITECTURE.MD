# SSO Architecture - Cross-Domain Authentication

## Overview

The FitCopilot ecosystem uses **SSO (Single Sign-On)** to enable seamless authentication across three applications deployed on different domains, while sharing a single Supabase database.

## Architecture Context

### Deployment Setup

- **Hub:** Deployed on primary domain
- **Trainer:** `https://fitcopilot-trainer.vercel.app/`
- **Chef:** `https://personalchef.app/`

### Database Setup

- **Single Supabase Database** with multi-schema organization
  - `public` schema: Auth, subscriptions, shared infrastructure
  - `trainer` schema: Workout and exercise data
  - `chef` schema: Recipe and nutrition data

## Why SSO is Required

### The Cross-Domain Session Problem

Even though all three apps share the same Supabase database and `auth.users` table, **browser security prevents session sharing across different domains**.

#### Without SSO:

```
1. User signs into Hub → Session on hub.domain.com
   ✅ User authenticated on Hub

2. Hub loads Trainer iframe → fitcopilot-trainer.vercel.app
   ❌ Trainer cannot access Hub's session (different domain)
   ❌ User must sign in AGAIN in Trainer

3. User navigates to Chef → personalchef.app
   ❌ Chef cannot access Hub's session (different domain)
   ❌ User must sign in AGAIN in Chef

Result: User signs in 3 separate times! 😞
```

#### With SSO:

```
1. User signs into Hub → Session created
   ✅ User authenticated on Hub

2. Hub redirects to Trainer
   → Hub generates SSO token and stores in sso_tokens table
   → Hub redirects to Trainer with ?sso_token=xxx in URL
   → Trainer reads token from URL
   → Trainer calls exchange_sso_token RPC function
   → RPC function returns Supabase access_token + refresh_token
   → Trainer calls supabase.auth.setSession() with tokens
   → Supabase validates tokens server-side
   → Trainer creates local authenticated session
   ✅ User authenticated on Trainer (no sign-in required)

3. User navigates to Chef
   → Same SSO flow
   ✅ User authenticated on Chef (no sign-in required)

Result: User signs in ONCE! 🎉
NO JWT secret needed on client-side! 🔒
```

## SSO vs Shared Database

This is a common point of confusion:

| Feature          | Shared Database          | SSO                           |
| ---------------- | ------------------------ | ----------------------------- |
| **Purpose**      | Share data & auth source | Share sessions across domains |
| **Solves**       | Data duplication         | Cross-domain authentication   |
| **Enables**      | Unified auth.users table | Seamless user experience      |
| **Required for** | Single source of truth   | Different domain deployments  |

**Key Insight:** Shared database provides **unified authentication source**, SSO provides **session sharing across domains**.

## Technical Implementation

### 1. Token Generation (Hub Side)

**File:** `src/services/hub/SSOService.ts`

The Hub generates signed JWT tokens when loading Trainer/Chef:

```typescript
const token = await ssoService.generateToken('trainer');
// Calls edge function: supabase/functions/generate-app-token/index.ts
```

**Token Contents:**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tier": "premium",
  "app_access": { "trainer": true, "chef": true },
  "iss": "fitcopilot-hub",
  "aud": "fitcopilot-apps",
  "exp": 1234567890
}
```

**Security:**

- Signed server-side in Edge Function with `SUPABASE_JWT_SECRET` (HS256)
- Expires in 1 hour
- JWT secret NEVER exposed to client-side code
- Token validation happens via Supabase auth.setSession() (server-side)
- Custom JWT treated as metadata only - no client-side verification needed

### 2. Token Passing

**Schema-Based SSO (URL Parameter):**

```typescript
// Hub generates token and stores in sso_tokens table
const token = await generateSSOToken(userId, 'trainer');

// Hub redirects to Trainer with token in URL
const url = new URL('https://fitcopilot-trainer.vercel.app');
url.searchParams.set('sso_token', token);
window.location.href = url.toString();
// Result: https://fitcopilot-trainer.vercel.app/?sso_token=xxx
```

### 3. Token Reception (Trainer/Chef Side)

**File:** `services/SchemaBasedSSO.ts` (schema-based implementation)

Trainer/Chef apps:

1. Read `sso_token` from URL parameter
2. Call `exchange_sso_token` RPC function with token
3. RPC function returns `access_token` and `refresh_token`
4. Call `supabase.auth.setSession()` with these tokens
5. Supabase validates tokens server-side and creates session
6. Store minimal session metadata in sessionStorage
7. Clean up token from URL

```typescript
// ⭐ CRITICAL: Use useSchemaBasedSSO hook (handles everything automatically)
const { user, session, isLoading, error } = useSchemaBasedSSO(supabase);

// Hook internally:
// 1. Reads token from URL
// 2. Calls exchange_sso_token RPC function
// 3. Establishes Supabase session
// 4. Cleans up URL
```

**NO client-side JWT verification** - The custom JWT is metadata only. All validation happens server-side via Supabase's auth API.

## Security Model

### Server-Side Only Secrets

- **SUPABASE_JWT_SECRET:** Exists ONLY in Edge Function environment
  - ❌ NOT in Hub client code
  - ❌ NOT in Trainer client code
  - ❌ NOT in Chef client code
  - ✅ ONLY in Supabase Edge Function: `generate-app-token`
- **Environment Variables:**
  - Edge Function: `SUPABASE_JWT_SECRET` (server-side only)
  - Hub/Trainer/Chef: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` only

### Token Lifecycle

1. **Generation:** Edge Function creates signed JWT (server-side only)
2. **Packaging:** Includes Supabase `access_token` + `refresh_token`
3. **Transmission:** URL parameter with token in query string
4. **Validation:** Supabase validates tokens server-side via `auth.setSession()`
5. **Expiration:** 1-hour lifespan
6. **Refresh:** User navigates from Hub again to get new token

### Security Features

- ✅ **Server-side JWT signing** - Secret never exposed to client
- ✅ **No client-side JWT verification** - Clients treat JWT as opaque metadata
- ✅ **Supabase validates tokens** - All validation server-side via auth API
- ✅ **Token expiration** - 1-hour lifespan
- ✅ **RPC function security** - Uses SECURITY DEFINER to bypass RLS safely
- ✅ **HTTPS-only** - Enforced in production
- ✅ **Nonce-based CSRF protection** - Prevents replay attacks
- ✅ **Anon key only** - Clients use only public anon key

## Token Exchange Protocol

### Hub → Trainer/Chef Token Flow

**Hub Side:**

```typescript
// Generate token and store in database
const token = await generateSSOToken(userId, 'trainer');
// Token stored in sso_tokens table with:
// - token (UUID)
// - user_id
// - target_app ('trainer' or 'chef')
// - access_token (Supabase)
// - refresh_token (Supabase)
// - expires_at (5 minutes from now)

// Redirect to Trainer with token in URL
window.location.href = `https://trainer.app/?sso_token=${token}`;
```

**Trainer/Chef Side:**

```typescript
// Use useSchemaBasedSSO hook (automatically handles everything)
const { user, session, isLoading, error } = useSchemaBasedSSO(supabase);

// Hook internally:
// 1. Reads sso_token from URL
// 2. Calls exchange_sso_token(token) RPC function
// 3. RPC returns: { access_token, refresh_token, user_id, expires_at }
// 4. Calls supabase.auth.setSession({ access_token, refresh_token })
// 5. Cleans token from URL
// 6. Deletes token from database (one-time use)
```

## Flow Diagrams

### Initial Authentication Flow

```
User                Hub                  Database              Trainer/Chef
  |                  |                        |                   |
  |-- Sign In ------>|                        |                   |
  |                  |-- Create Session ----->|                   | (Supabase)
  |                  |<-- Session Created ----|                   |
  |<-- Logged In ----|                        |                   |
  |                  |                        |                   |
  |-- Click Trainer->|                        |                   |
  |                  |-- Generate Token ----->|                   |
  |                  |   Store in sso_tokens  |                   |
  |                  |<-- Token Stored -------|                   |
  |                  |                        |                   |
  |                  |-- Redirect w/ token ------------------------->|
  |                  |   ?sso_token=xxx       |                   |
  |                  |                        |                   |
  |                  |                        |     [Read token from URL]
  |                  |                        |     [Call exchange_sso_token RPC]
  |                  |                        |<-- RPC Call -------|
  |                  |                        |-- Return tokens -->|
  |                  |                        |   (access/refresh) |
  |                  |                        |     [Call setSession()]
  |                  |                        |                   |-- Validate -->| (Supabase)
  |                  |                        |                   |<-- Valid -----|
  |                  |                        |     [Session created, user authenticated]
  |                  |                        |     [Delete token from DB]
  |<-- Trainer Loaded (user logged in) ---------------------------|
```

### Token Refresh Flow

```
Trainer/Chef         Hub                  Database
  |                  |                        |
  |-- Session Expired->|                      |
  |                  |                        |
  |                  |-- Generate New Token ->|
  |                  |   Store in sso_tokens  |
  |                  |<-- Token Stored -------|
  |                  |                        |
  |                  |-- Redirect w/ token -->|
  |                  |   ?sso_token=new-xxx   |
  |                  |                        |
  |     [Read new token from URL]             |
  |     [Call exchange_sso_token RPC]        |
  |                  |<-- RPC Call -----------|
  |                  |-- Return tokens ------>|
  |     [Call setSession()]                  |
  |<-- Session Refreshed --------------------|
```

## Configuration Requirements

### Hub Configuration

**.env (Production):**

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_EXTERNAL_TRAINER_URL=https://fitcopilot-trainer.vercel.app/
VITE_EXTERNAL_CHEF_URL=https://personalchef.app/
```

**.env.local (Development):**

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_EXTERNAL_TRAINER_URL=http://localhost:3001
VITE_EXTERNAL_CHEF_URL=http://localhost:3002
```

### Trainer Configuration

**.env or .env.local:**

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co  # Same as Hub
VITE_SUPABASE_ANON_KEY=your-anon-key                 # Same as Hub
VITE_HUB_URL=https://hub.fitcopilot.com             # For origin validation
# ❌ NO VITE_SUPABASE_JWT_SECRET - This is a security risk!
```

### Chef Configuration

**.env or .env.local:**

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co  # Same as Hub
VITE_SUPABASE_ANON_KEY=your-anon-key                 # Same as Hub
VITE_HUB_URL=https://hub.fitcopilot.com             # For origin validation
# ❌ NO VITE_SUPABASE_JWT_SECRET - This is a security risk!
```

### Edge Function Configuration (Supabase Dashboard)

**CRITICAL:** JWT secret exists ONLY in Edge Function environment:

```bash
SUPABASE_JWT_SECRET=your-secret-here
```

Set this in: **Supabase Dashboard → Edge Functions → generate-app-token → Environment Variables**

## Common Misconceptions

### ❌ "We have a shared database, so we don't need SSO"

**Wrong!** Shared database means:

- ✅ Same user records (`auth.users`)
- ✅ Same authentication source
- ❌ Does NOT mean shared sessions across domains

Browser security (Same-Origin Policy) prevents `fitcopilot-trainer.vercel.app` from accessing sessions created on `hub.example.com`.

### ❌ "SSO is only for multiple databases"

**Wrong!** SSO can serve two purposes:

1. **Identity Federation:** Sync users across separate databases (traditional SSO)
2. **Session Sharing:** Share authentication state across domains (our use case)

We use SSO for #2 - sharing sessions across domains while querying the same database.

### ✅ "SSO enables seamless UX across domains with shared auth backend"

**Correct!** SSO bridges the gap between:

- **Backend:** Single database with unified `auth.users`
- **Frontend:** Multiple domains that can't natively share sessions

## Benefits

### User Experience

- ✅ Sign in **once** in Hub
- ✅ Access Trainer and Chef **without re-authentication**
- ✅ Seamless navigation between apps
- ✅ Consistent user identity across ecosystem

### Development

- ✅ Single source of truth for user data
- ✅ No need to sync auth databases
- ✅ Simplified access control (RLS on shared tables)
- ✅ Easy to add new apps to ecosystem

### Security

- ✅ Cryptographically signed tokens
- ✅ Short-lived tokens (1 hour)
- ✅ RPC function security (SECURITY DEFINER bypasses RLS safely)
- ✅ HTTPS enforced in production

## Alternatives Considered

### Alternative 1: Shared Top-Level Domain

**Approach:** Deploy all apps on subdomains of same domain

- `hub.fitcopilot.com`
- `trainer.fitcopilot.com`
- `chef.fitcopilot.com`

**Pros:** Could share cookies across subdomains  
**Cons:** Requires custom domain setup, DNS configuration, may not work with free Vercel hosting

### Alternative 2: Require Sign-In Per App

**Approach:** Users sign in separately on each domain

**Pros:** Simple, no SSO code needed  
**Cons:** Terrible UX - users annoyed by multiple sign-ins

### Alternative 3: Supabase OAuth Flow

**Approach:** Use Supabase's built-in OAuth redirect flow

**Pros:** Official Supabase feature  
**Cons:** Redirects user away from app, complex state management, poor UX in iframes

### ✅ Our Choice: JWT-based SSO

**Best balance of security, UX, and development simplicity**

## Troubleshooting

### "Session establishment failed" / "Invalid tokens"

- Verify Edge Function has `SUPABASE_JWT_SECRET` set correctly (NOT prefixed with VITE\_)
- Check that Hub successfully received session tokens from Supabase
- Ensure `access_token` and `refresh_token` are included in SSO message
- Verify Supabase URL and anon key match across all apps

### "401 Unauthorized" in Trainer/Chef

- ✅ Check: SSO token was received via postMessage
- ✅ Check: `supabase.auth.setSession()` was called successfully
- ✅ Check: `supabase.auth.getSession()` returns valid session
- ✅ Check: Database queries use `.schema('trainer')` or `.schema('chef')`
- ✅ Check: RLS policies allow authenticated users to access tables

### "Token exchange failed"

- Check that iframe origin matches `SSO_ALLOWED_ORIGINS` in Hub config
- Verify `VITE_HUB_URL` is set correctly in Trainer/Chef apps
- Check browser console for CORS or origin validation errors
- Ensure iframe sandbox allows `allow-same-origin` and `allow-scripts`

### "JWT secret exposed in client bundle"

- ❌ NEVER use `VITE_SUPABASE_JWT_SECRET` in client code
- ✅ Only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Build and search: `npm run build && grep -r "JWT_SECRET" dist/`
- Should return: nothing found

## Future Enhancements

1. **Token Refresh:** Automatic background refresh before expiration
2. **Multi-Tab Sync:** Broadcast session across tabs using BroadcastChannel API
3. **Session Persistence:** Store refresh tokens for longer sessions
4. **Audit Logging:** Track SSO token usage in `app_access_log` table

## Related Files

### Hub (Token Generation)

- `src/services/hub/SSOService.ts` - Token generation and iframe communication
- `src/routes/ExternalTrainer.tsx` - Trainer iframe with SSO integration
- `src/routes/ExternalChef.tsx` - Chef iframe with SSO integration
- `supabase/functions/generate-app-token/index.ts` - JWT signing edge function

### Trainer/Chef (Token Reception)

- `services/SchemaBasedSSO.ts` - Schema-based SSO implementation (URL token exchange)
- `docs/sso-architecture/TRAINER_APP_SCHEMA_SSO_MIGRATION.md` - Migration guide (completed)
- `docs/sso-architecture/CHEF_APP_SCHEMA_SSO_MIGRATION.md` - Migration guide for Chef app

### Configuration

- `src/config/index.ts` - External app URLs and allowed origins
- `.env.local` - Local development configuration
- Vercel Dashboard - Production environment variables

## Summary

**SSO in FitCopilot is NOT about:**

- ❌ Syncing users across multiple databases
- ❌ Complex identity federation
- ❌ Enterprise SSO providers (Okta, Auth0, etc.)
- ❌ Client-side JWT verification with secrets

**SSO in FitCopilot IS about:**

- ✅ Sharing authentication sessions across different domains
- ✅ Seamless user experience (sign in once, access all apps)
- ✅ Server-side token validation via Supabase auth API
- ✅ Secure token passing using URL parameters with RPC function exchange
- ✅ Leveraging shared Supabase database while handling cross-domain constraints
- ✅ Using only public anon keys on client-side

**KEY SECURITY PRINCIPLE:** JWT secret exists ONLY in Edge Function. Clients use `supabase.auth.setSession()` with Supabase tokens - all validation happens server-side.

**Bottom Line:** SSO bridges the gap between our unified backend (single database) and distributed frontend (multiple domains) **without exposing secrets to client code**.
