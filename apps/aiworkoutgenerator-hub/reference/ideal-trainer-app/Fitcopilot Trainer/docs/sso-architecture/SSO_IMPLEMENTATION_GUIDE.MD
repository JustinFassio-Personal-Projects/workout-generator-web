# SSO Implementation Guide for Trainer & Chef Apps

> **⚠️ UPDATE:** This guide describes the old postMessage-based SSO implementation. The Trainer app has been migrated to schema-based SSO (URL-based token exchange). See `TRAINER_APP_SCHEMA_SSO_MIGRATION.md` for the current implementation. This guide is kept for historical reference.

## Overview

This guide explains how to implement SSO authentication in the Trainer and Chef apps to enable proper Supabase database access while embedded in the Hub iframe.

**Note:** The current implementation uses schema-based SSO. See migration guides for details.

## Critical Change: Supabase Session Authentication

**The SSO token now includes Supabase `access_token` and `refresh_token`** which must be used to establish a valid Supabase session in the Trainer/Chef apps.

---

## Token Structure

### What the Hub Sends

```typescript
interface SSOTokenData {
  // Custom JWT with user metadata
  token: string;

  // Metadata
  expires_at: string;
  app_access: Record<string, boolean>;
  tier: string;
  user_id: string;

  // 🔑 CRITICAL: Supabase session credentials
  access_token: string;
  refresh_token: string;
}
```

### Custom JWT Payload (decoded from `token` field)

```typescript
{
  sub: string;              // user_id
  email: string;
  full_name: string | null;
  tier: string;
  app_access: Record<string, boolean>;
  target_app: 'trainer' | 'chef';
  preferred_units: Record<string, string> | null;
  fitness_goals: string[] | null;
  iss: 'fitcopilot-hub';
  aud: 'fitcopilot-apps';
  iat: number;
  exp: number;
}
```

---

## Implementation Steps

### Step 1: Receive SSO Token

The token arrives via **URL parameter** (primary) or **postMessage** (fallback):

```typescript
// From URL
const params = new URLSearchParams(window.location.search);
const ssoTokenString = params.get('sso_token');

// From postMessage
window.addEventListener('message', (event) => {
  if (event.data.type === 'SSO_TOKEN') {
    const tokenData = event.data.token;
    // Use tokenData.access_token and tokenData.refresh_token
  }
});
```

### Step 2: Establish Supabase Session

**⭐ THIS IS THE CRITICAL SECURITY STEP ⭐**

**NO client-side JWT verification needed!** The custom JWT is metadata only. All validation happens server-side via Supabase.

```typescript
import { createClient } from '@supabase/supabase-js';

// ✅ Initialize with anon key only (NO JWT secret needed)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!, // Public anon key only
);

// When you receive the SSO token:
async function handleSSOToken(tokenData: SSOTokenData) {
  // ✅ CRITICAL: Establish Supabase session
  // Supabase validates tokens server-side - no client-side verification needed
  const { data, error } = await supabase.auth.setSession({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  if (error) {
    console.error('❌ Failed to set Supabase session:', error);
    throw error;
  }

  console.log('✅ Supabase session established:', data.session?.user.email);

  // Now you can query the database with authenticated user!
  const { data: profile } = await supabase
    .schema('trainer') // or 'chef'
    .from('workouts')
    .select('*')
    .eq('user_id', tokenData.user_id);

  console.log('✅ Database query successful:', profile);
}
```

**SECURITY NOTE:** The custom JWT is treated as opaque metadata. You can access `tokenData.tier`, `tokenData.app_access`, etc. for application logic, but you don't need to verify its signature - Supabase already validated the session server-side when you called `setSession()`.

---

## Complete Example: React Component

```typescript
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Check URL for SSO token
        const params = new URLSearchParams(window.location.search);
        const ssoTokenParam = params.get('sso_token');

        if (ssoTokenParam) {
          // Parse the token data (it's a JSON string with all fields)
          // Note: The Hub actually sends the full token data structure
          console.log('🔐 Found SSO token in URL');

          // In reality, the Hub sends the token data via postMessage
          // So we need to listen for it
        }

        // 2. Listen for postMessage from Hub
        const handleMessage = async (event: MessageEvent) => {
          if (event.data.type === 'SSO_TOKEN' && event.data.token) {
            const tokenData = event.data.token;

            console.log('📨 Received SSO token via postMessage');

            // ✅ CRITICAL: Set Supabase session
            const { data, error } = await supabase.auth.setSession({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
            });

            if (error) {
              console.error('❌ Failed to establish session:', error);
              return;
            }

            console.log('✅ Supabase session established');
            setUser(data.session?.user);
            setIsLoading(false);
          }
        };

        window.addEventListener('message', handleMessage);

        // 3. Send ready message to Hub
        // ⚠️ SECURITY: Always specify the Hub origin, never use '*'
        if (window.parent !== window) {
          const HUB_ORIGIN = import.meta.env.VITE_HUB_URL || 'https://fitcopilot-hub.vercel.app';
          window.parent.postMessage({ type: 'SSO_READY' }, HUB_ORIGIN);
        }

        // Cleanup
        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome, {user.email}!</div>;
}
```

---

## Environment Variables Required

Both Trainer and Chef apps need these in `.env.local`:

```bash
# Hub Configuration (REQUIRED for SSO origin validation)
VITE_HUB_URL=https://fitcopilot-hub.vercel.app  # Production Hub URL
# For local dev: VITE_HUB_URL=http://localhost:5175

# Supabase Configuration (MUST match Hub's database)
VITE_SUPABASE_URL=https://tknkxfeyftgeicuosrhi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ DO NOT SET: VITE_SUPABASE_JWT_SECRET
# JWT secret should NEVER be in client code - it's a security risk!
# Token validation happens server-side via Supabase auth.setSession()
```

---

## Database Queries

After establishing the session, use the appropriate schema:

### Trainer App

```typescript
// ✅ Correct
await supabase.schema('trainer').from('workouts').select('*');
await supabase.schema('trainer').from('trainer_profiles').select('*');
await supabase.schema('public').from('user_profiles').select('*');

// ❌ Wrong - will fail with "schema must be public"
await supabase.from('workouts').select('*');
```

### Chef App

```typescript
// ✅ Correct
await supabase.schema('chef').from('recipes').select('*');
await supabase.schema('chef').from('shopping_list').select('*');
await supabase.schema('public').from('user_profiles').select('*');

// ❌ Wrong
await supabase.from('recipes').select('*');
```

---

## Security Architecture

### Why No Client-Side JWT Verification?

**SECURITY BEST PRACTICE:** JWT secrets should NEVER be exposed to client-side code.

**What we do instead:**

1. ✅ Edge Function signs JWT with secret (server-side only)
2. ✅ Hub sends `access_token` + `refresh_token` to client
3. ✅ Client calls `supabase.auth.setSession()` with these tokens
4. ✅ Supabase validates tokens server-side via its auth API
5. ✅ Client gets authenticated session - ready to query database

**Benefits:**

- **No secrets in client bundle** - JWT secret only in Edge Function
- **Simpler implementation** - No `jose` or `jsonwebtoken` libraries needed
- **Better security** - Supabase handles all validation server-side
- **Consistent with Supabase** - Using official auth flow
- **Easier debugging** - Supabase provides clear error messages

**The custom JWT is metadata only** - You can access `tokenData.tier`, `tokenData.app_access`, etc. for application logic, but don't verify its signature client-side.

## Security Considerations

### ⚠️ CRITICAL: postMessage Origin Validation

**Always specify the target origin in postMessage - NEVER use `'*'`**

```typescript
// ❌ INSECURE - Anyone can receive this message
window.parent.postMessage({ type: 'SSO_READY' }, '*');

// ✅ SECURE - Only the Hub can receive this message
const HUB_ORIGIN = import.meta.env.VITE_HUB_URL;
window.parent.postMessage({ type: 'SSO_READY' }, HUB_ORIGIN);
```

**Why this matters:**

- Using `'*'` allows **any window** to receive SSO messages
- Malicious sites could intercept SSO tokens
- Always validate both sender origin (listener) and receiver origin (postMessage)

**Best practices:**

1. ✅ Store Hub URL in environment variables
2. ✅ Validate `event.origin` in message listeners
3. ✅ Specify target origin in `postMessage()`
4. ❌ Never use `'*'` as targetOrigin
5. ✅ Use HTTPS in production

---

## Troubleshooting

### Issue: 401 Unauthorized Errors

**Cause:** Supabase session not established

**Solution:**

```typescript
// Check if session exists
const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) {
  console.error('❌ No Supabase session - setSession() was not called');
}
```

### Issue: 406 Not Acceptable / Schema Errors

**Cause:** Querying without specifying schema

**Solution:**

```typescript
// Always use .schema() for app-specific tables
await supabase.schema('trainer').from('workouts').select('*');
```

### Issue: "permission denied for table"

**Cause:** RLS policies require authenticated user

**Solution:** Ensure `supabase.auth.setSession()` was called successfully before querying.

---

## Testing Checklist

- [ ] SSO token received via URL or postMessage
- [ ] `supabase.auth.setSession()` called with access_token and refresh_token
- [ ] `supabase.auth.getSession()` returns valid session
- [ ] Database queries use `.schema('trainer')` or `.schema('chef')`
- [ ] User data loads successfully
- [ ] No 401/403/406 errors in console

---

## Summary

The key change is that **SSO tokens now include Supabase session credentials**. You must call:

```typescript
await supabase.auth.setSession({
  access_token: tokenData.access_token,
  refresh_token: tokenData.refresh_token,
});
```

This establishes a valid Supabase session that enables database queries with proper RLS policy enforcement.
