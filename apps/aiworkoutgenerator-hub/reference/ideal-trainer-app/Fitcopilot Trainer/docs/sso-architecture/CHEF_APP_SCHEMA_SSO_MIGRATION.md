# Chef App Schema-Based SSO Migration Plan

## Overview

This document provides a step-by-step plan to migrate the Chef app from postMessage-based SSO to schema-based SSO (URL-based token exchange), matching the implementation we completed for the Trainer app.

## Current State

- **Chef app**: Using postMessage-based SSO (similar to Trainer's old implementation)
- **Hub app**: Already updated to use schema-based SSO (passes tokens via URL)
- **Issue**: Mismatch causes postMessage errors since Hub no longer listens for postMessage

## Migration Steps

### Step 1: Create SchemaBasedSSO Service

**File to create:** `services/SchemaBasedSSO.ts` (in Chef app)

Copy the exact implementation from the Trainer app:

```typescript
/**
 * Schema-Based SSO Service
 * Handles SSO authentication via URL-based token exchange
 *
 * This replaces the postMessage-based SSO approach with a simpler URL-based flow:
 * 1. Hub generates token and stores in sso_tokens table
 * 2. Hub redirects to Chef with ?sso_token=xxx in URL
 * 3. Chef reads token from URL and exchanges it for Supabase session
 * 4. Chef cleans up URL and establishes authenticated session
 */

import { useEffect, useState, useRef } from 'react';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

interface SSOTokenData {
  access_token: string;
  refresh_token: string;
  user_id: string;
  tier: string;
  app_access: Record<string, boolean>;
  expires_at: string;
}

interface UseSchemaBasedSSOReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Debug function to check SSO token extraction from URL
 */
export function getSSOTokenFromUrl(): string | null {
  console.log('🔍 [DEBUG] Full URL:', window.location.href);
  console.log('🔍 [DEBUG] Search params:', window.location.search);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('sso_token');

  console.log('🔍 [DEBUG] Token found:', token ? 'YES' : 'NO');
  if (token) {
    console.log('🔍 [DEBUG] Token value (first 20 chars):', token.substring(0, 20) + '...');
    console.log('🔍 [DEBUG] Token length:', token.length);
  } else {
    console.log('🔍 [DEBUG] All URL params:', Array.from(params.entries()));
  }

  return token;
}

/**
 * Exchange SSO token for Supabase session
 */
async function exchangeSSOToken(
  supabaseClient: SupabaseClient,
  token: string,
): Promise<SSOTokenData | null> {
  try {
    console.log('🔐 SchemaBasedSSO: Exchanging SSO token...');

    // Try RPC function FIRST (this bypasses RLS and is the correct approach)
    try {
      console.log('🔐 SchemaBasedSSO: Attempting RPC function (bypasses RLS)...');
      const { data: rpcData, error: rpcError } = await supabaseClient.rpc('exchange_sso_token', {
        token_value: token,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const tokenData = rpcData[0];
        console.log('✅ SchemaBasedSSO: Token exchanged via RPC function');
        return {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          user_id: tokenData.user_id,
          tier: 'free', // Default tier (can be fetched from subscriptions table if needed)
          app_access: {}, // Default app access
          expires_at: tokenData.expires_at || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
      } else if (rpcError) {
        console.error('🔐 SchemaBasedSSO: RPC function error:', rpcError);
        // Fall through to try direct table query (might work if RLS allows it)
      }
    } catch (rpcErr) {
      console.log('🔐 SchemaBasedSSO: RPC function not available, trying direct table query...');
    }

    // Fallback: Try direct table query (will likely fail due to RLS, but worth trying)
    let query = supabaseClient
      .from('sso_tokens')
      .select('access_token, refresh_token, user_id, created_at, id')
      .eq('token', token)
      .single();

    let { data, error } = await query;

    // If that fails, try querying by 'id' (in case token is the UUID primary key)
    if (
      error &&
      (error.code === 'PGRST116' || error.message?.includes('token') || error.code === 'PGRST301')
    ) {
      console.log('🔐 SchemaBasedSSO: Token field query failed, trying id field...');
      query = supabaseClient
        .from('sso_tokens')
        .select('access_token, refresh_token, user_id, created_at, id')
        .eq('id', token)
        .single();

      const result = await query;
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('🔐 SchemaBasedSSO: Error querying sso_tokens:', error);
      return null;
    }

    if (!data) {
      console.error('🔐 SchemaBasedSSO: Token not found in sso_tokens table');
      return null;
    }

    // Validate required fields
    if (!data.access_token || !data.refresh_token || !data.user_id) {
      console.error('🔐 SchemaBasedSSO: Missing required fields in token data');
      return null;
    }

    // Check if token is expired (tokens expire after 5 minutes)
    let expiresAt: Date;
    if ((data as any).expires_at) {
      expiresAt = new Date((data as any).expires_at);
    } else if (data.created_at) {
      const createdAt = new Date(data.created_at);
      expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5 minutes
    } else {
      console.error('🔐 SchemaBasedSSO: No expiration time available');
      return null;
    }

    const now = new Date();
    if (now > expiresAt) {
      console.error('🔐 SchemaBasedSSO: Token has expired');
      return null;
    }

    console.log('✅ SchemaBasedSSO: Token found and valid');

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user_id,
      tier: (data as any).tier || 'free',
      app_access: (data as any).app_access || {},
      expires_at: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('🔐 SchemaBasedSSO: Error exchanging token:', error);
    return null;
  }
}

/**
 * Exchange SSO token and establish session
 */
async function exchangeSSOTokenAndSetSession(
  token: string,
  supabaseClient: SupabaseClient,
): Promise<void> {
  console.log('🔐 exchangeSSOTokenAndSetSession: Starting token exchange...');

  const tokenData = await exchangeSSOToken(supabaseClient, token);
  console.log(
    '🔍 [DEBUG] exchangeSSOTokenAndSetSession: Token exchange result:',
    tokenData ? 'SUCCESS' : 'FAILED',
  );

  if (!tokenData) {
    throw new Error('Failed to exchange SSO token');
  }

  console.log(
    '🔍 [DEBUG] exchangeSSOTokenAndSetSession: Token data received, establishing session...',
  );

  // Establish Supabase session
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  });

  if (sessionError) {
    console.error('❌ exchangeSSOTokenAndSetSession: Session error:', sessionError);
    throw new Error(`Failed to establish session: ${sessionError.message}`);
  }

  if (!sessionData.session) {
    console.error('❌ exchangeSSOTokenAndSetSession: No session returned');
    throw new Error('No session returned from setSession');
  }

  console.log('✅ SchemaBasedSSO: Successfully exchanged SSO token for session');
  console.log('✅ SchemaBasedSSO: User authenticated:', sessionData.session.user.email);

  // Store SSO session metadata in sessionStorage
  const sessionMetadata = {
    user_id: sessionData.session.user.id,
    tier: tokenData.tier,
    app_access: tokenData.app_access,
    expires_at: tokenData.expires_at,
    sso_active: true,
  };
  sessionStorage.setItem('sso_session', JSON.stringify(sessionMetadata));
  sessionStorage.setItem('sso_active', 'true');
  console.log('💾 [DEBUG] exchangeSSOTokenAndSetSession: Session metadata stored');

  // Clean up token from URL
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.delete('sso_token');
  window.history.replaceState({}, '', newUrl.toString());
  console.log('🧹 SchemaBasedSSO: Cleaned sso_token from URL');
}

/**
 * React hook for schema-based SSO authentication
 */
export function useSchemaBasedSSO(supabaseClient: SupabaseClient): UseSchemaBasedSSOReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const tokenProcessedRef = useRef(false);
  const ssoTokenRef = useRef<string | null>(null);

  // CRITICAL: Read token from URL immediately on mount (synchronously)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('sso_token');

    if (token) {
      console.log(
        '✅ [DEBUG] useSchemaBasedSSO: Token captured immediately on mount:',
        token.substring(0, 20) + '...',
      );
      ssoTokenRef.current = token;

      // Clean up token from URL immediately to prevent React Router from seeing it
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('sso_token');
      window.history.replaceState({}, '', newUrl.toString());
      console.log('🧹 [DEBUG] useSchemaBasedSSO: Token removed from URL immediately');
    } else {
      console.log('ℹ️ [DEBUG] useSchemaBasedSSO: No token in URL on mount');
    }
  }, []); // Run only once on mount

  useEffect(() => {
    async function initAuth() {
      if (tokenProcessedRef.current) {
        console.log('🔍 [DEBUG] initAuth: Token already processed, skipping');
        return;
      }

      console.log('🔍 [DEBUG] initAuth: Starting authentication check...');

      try {
        // First, check if we already have a session
        console.log('🔍 [DEBUG] initAuth: Checking for existing session...');
        const {
          data: { session: existingSession },
        } = await supabaseClient.auth.getSession();

        if (existingSession) {
          console.log('✅ [DEBUG] initAuth: Found existing session, using it');
          setSession(existingSession);
          setUser(existingSession.user);
          setIsLoading(false);
          tokenProcessedRef.current = true;
          return;
        }

        console.log('🔍 [DEBUG] initAuth: No existing session, checking for SSO token...');

        // Use the token we captured on mount (not from current URL)
        const token = ssoTokenRef.current;
        if (!token) {
          console.log(
            'ℹ️ [DEBUG] initAuth: No SSO token available, user needs to authenticate via Hub',
          );
          setIsLoading(false);
          return;
        }

        console.log('✅ [DEBUG] initAuth: SSO token found (from ref), processing...');
        console.log('🔍 [DEBUG] initAuth: Token value:', token.substring(0, 20) + '...');

        // Mark as processed BEFORE exchange (prevents race conditions)
        tokenProcessedRef.current = true;
        ssoTokenRef.current = null;
        console.log('🔍 [DEBUG] initAuth: Marked token as processed, starting exchange...');

        // Exchange token for session
        await exchangeSSOTokenAndSetSession(token, supabaseClient);
        console.log('✅ [DEBUG] initAuth: Token exchange completed, checking session...');

        const {
          data: { session: newSession },
        } = await supabaseClient.auth.getSession();

        if (newSession) {
          console.log('✅ [DEBUG] initAuth: Session established successfully');
          setSession(newSession);
          setUser(newSession.user);
          setError(null);
        } else {
          throw new Error('Failed to establish session');
        }
      } catch (err) {
        console.error('❌ SchemaBasedSSO: Schema-based SSO failed:', err);
        setError(err instanceof Error ? err : new Error('Authentication failed'));
        tokenProcessedRef.current = false;
        ssoTokenRef.current = null;
      } finally {
        setIsLoading(false);
        console.log('🔍 [DEBUG] initAuth: Authentication check complete');
      }
    }

    initAuth();
  }, [supabaseClient]);

  // Add listener for auth state changes to keep the session in sync
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  return { user, session, isLoading, error };
}
```

**Key points:**

- Uses `useRef` to prevent duplicate token processing
- Captures token immediately on mount (before React Router strips it)
- Tries RPC function first (bypasses RLS)
- Falls back to direct table query if RPC fails
- Handles all error cases gracefully

### Step 2: Update App.tsx (or Main Entry Point)

**File to update:** `App.tsx` (or wherever SSO is initialized in Chef app)

**Before (postMessage-based):**

```typescript
import { ssoReceiver } from './services/SSOReceiver';
import { supabase } from './services/dbService';

function App() {
  useEffect(() => {
    ssoReceiver.initialize(async (tokenData) => {
      // Handle token...
    });
    return () => ssoReceiver.cleanup();
  }, []);
  // ...
}
```

**After (schema-based):**

```typescript
import { useSchemaBasedSSO, getSSOTokenFromUrl } from './services/SchemaBasedSSO';
import { supabase } from './services/dbService';

function App() {
  // Use schema-based SSO (URL-based token exchange)
  const { user, session, isLoading, error } = useSchemaBasedSSO(supabase);

  // Debug: Check for SSO token on app initialization
  React.useEffect(() => {
    console.log('🔍 [DEBUG] App.tsx: Initializing, checking for SSO token...');
    const token = getSSOTokenFromUrl();
    if (token) {
      console.log('✅ [DEBUG] App.tsx: SSO token detected in URL on mount');
    } else {
      console.log('ℹ️ [DEBUG] App.tsx: No SSO token in URL on mount');
    }
  }, []);

  // Log authentication state for debugging
  React.useEffect(() => {
    if (error) {
      console.error('❌ App.tsx: SSO error:', error);
    }
    if (session && user) {
      console.log('✅ App.tsx: User authenticated via schema-based SSO:', user.email);
    }
  }, [user, session, error]);

  // ... rest of app
}
```

**Changes:**

- Remove `ssoReceiver` import and initialization
- Remove `useEffect` that calls `ssoReceiver.initialize()`
- Add `useSchemaBasedSSO` hook
- Add debug logging (optional, can remove later)

### Step 3: Verify Database Setup

**The RPC function should already exist** (we created it for Trainer app), but verify it works for Chef:

```sql
-- Verify the function exists and works
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'exchange_sso_token';
```

**Expected result:** Should show `exchange_sso_token` with `security_type = 'DEFINER'`

**If the function doesn't exist**, create it using the same migration we used for Trainer:

```sql
CREATE OR REPLACE FUNCTION exchange_sso_token(token_value TEXT)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  user_id UUID,
  expires_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  token_record RECORD;
BEGIN
  SELECT
    t.access_token,
    t.refresh_token,
    t.user_id,
    t.expires_at
  INTO token_record
  FROM sso_tokens t
  WHERE t.token = token_value
    AND t.expires_at > NOW();

  IF token_record IS NULL THEN
    RAISE EXCEPTION 'Token not found or expired';
  END IF;

  DELETE FROM sso_tokens WHERE token = token_value;

  RETURN QUERY SELECT
    token_record.access_token,
    token_record.refresh_token,
    token_record.user_id,
    token_record.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION exchange_sso_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION exchange_sso_token(TEXT) TO authenticated;
```

### Step 4: Remove Old SSO Code (Optional)

**File:** `services/SSOReceiver.ts`

- Keep the file for now (for rollback if needed)
- Remove its usage from `App.tsx`
- Can delete later once migration is verified

### Step 5: Update Tests (If Applicable)

**Files to update/create:**

- `src/test/services/SchemaBasedSSO.test.ts` (new)
- Update any existing SSO-related tests

**Test cases to cover:**

- Token extraction from URL
- Token exchange via RPC function
- URL cleanup after token processing
- Error handling (expired tokens, invalid tokens)
- Session establishment
- Auth state change listener

### Step 6: Testing Checklist

1. **Start Hub app:** `http://localhost:5173`
2. **Start Chef app:** `http://localhost:3002` (or configured port)
3. **Navigate to Chef from Hub**
4. **Check browser console for:**
   - `✅ Generated SSO token for chef` (Hub)
   - `✅ [DEBUG] useSchemaBasedSSO: Token captured immediately on mount` (Chef)
   - `🔐 SchemaBasedSSO: Attempting RPC function (bypasses RLS)...` (Chef)
   - `✅ SchemaBasedSSO: Token exchanged via RPC function` (Chef)
   - `✅ SchemaBasedSSO: Successfully exchanged SSO token for session` (Chef)
   - `✅ App.tsx: User authenticated via schema-based SSO` (Chef)
   - **No postMessage errors!**
5. **Verify:**
   - URL is cleaned (no `sso_token` parameter visible)
   - User is authenticated and can access protected routes
   - Session persists after navigation
   - No console errors

### Step 7: Troubleshooting

**If token is not captured:**

- Check that token is in URL when Chef app loads
- Verify React Router isn't stripping query params before hook runs
- Check debug logs: `🔍 [DEBUG] Full URL:` should show token

**If RPC function fails:**

- Verify function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'exchange_sso_token';`
- Check function permissions: Should be granted to `anon` and `authenticated`
- Verify function uses `SECURITY DEFINER`

**If token exchange fails:**

- Check if token exists in database: `SELECT * FROM sso_tokens WHERE token = 'xxx' AND expires_at > NOW();`
- Verify token hasn't expired (5-minute window)
- Check RLS policies aren't blocking (RPC function should bypass this)

**If session not established:**

- Verify `access_token` and `refresh_token` are valid
- Check Supabase client configuration
- Verify `supabase.auth.setSession()` is being called

## Key Differences from Trainer App

The Chef app migration should be **identical** to the Trainer app migration:

1. Same `SchemaBasedSSO.ts` service
2. Same `useSchemaBasedSSO` hook
3. Same RPC function (shared database)
4. Same App.tsx pattern

**Only difference:** The Hub app will pass `target_app = 'chef'` when generating tokens, but the exchange logic is the same.

## Benefits

- ✅ No postMessage errors
- ✅ No cross-origin issues
- ✅ Simpler code
- ✅ Works in dev and production
- ✅ More secure (tokens expire after 5 minutes)
- ✅ Consistent with Trainer app implementation

## Rollback Plan

If issues arise:

1. Revert `App.tsx` to use `ssoReceiver.initialize()`
2. Keep `SchemaBasedSSO.ts` file (don't delete)
3. Use feature flag to switch between implementations if needed

## Post-Migration Cleanup

Once migration is verified and stable:

1. Remove `SSOReceiver.ts` file (if no longer needed)
2. Remove debug logging (optional)
3. Update documentation
4. Remove old postMessage-related code

## Notes

- The RPC function is **shared** between Trainer and Chef apps (same database)
- Tokens are scoped by `target_app` column in `sso_tokens` table
- Both apps use the same authentication flow
- The migration is **identical** to Trainer app - just copy the files and update App.tsx
