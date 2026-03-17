# Authentication Setup Guide

This guide explains how to set up authentication for the Fitcopilot Personal Trainer application.

## Overview

The application requires authentication to access protected routes. Authentication can be provided via:

1. **Direct Sign-In**: Users sign in directly through the AccountPage component
2. **SSO from Hub**: Users authenticate through the Hub app and access Trainer via SSO tokens

## Supabase Configuration

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

### 2. Set Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

**Important**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### 3. Initialize Supabase Client

The application initializes the Supabase client in `services/dbService.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

In production, these values are read from environment variables.

## Authentication Flow

### Direct Sign-In

Users can sign in directly through the `/account` route using email and password. The app uses Supabase authentication for this flow.

### SSO from Hub (Schema-Based Authentication)

The app uses schema-based SSO (URL-based token exchange) for authentication from the Hub app:

1. **Hub App** generates SSO token and redirects:

   ```typescript
   // Hub generates token and stores in sso_tokens table
   const token = await generateSSOToken(userId, 'trainer');

   // Hub redirects to Trainer with token in URL
   window.location.href = `http://localhost:3001/?sso_token=${token}`;
   ```

2. **Trainer App** uses `useSchemaBasedSSO` hook to handle authentication:

   ```typescript
   import { useSchemaBasedSSO } from './services/SchemaBasedSSO';

   function App() {
     const { user, session, isLoading, error } = useSchemaBasedSSO(supabase);
     // Hook automatically:
     // - Reads token from URL
     // - Exchanges via RPC function
     // - Establishes Supabase session
     // - Cleans up URL
   }
   ```

3. **Token Exchange** happens via RPC function (bypasses RLS):

   ```sql
   -- RPC function exchanges token for Supabase session tokens
   SELECT * FROM exchange_sso_token('token-value');
   -- Returns: access_token, refresh_token, user_id, expires_at
   ```

4. **Session Establishment** uses Supabase's `setSession()`:

   ```typescript
   await supabase.auth.setSession({
     access_token: tokenData.access_token,
     refresh_token: tokenData.refresh_token,
   });
   ```

## Security Best Practices

### 1. RPC Function Setup

The `exchange_sso_token` RPC function must exist in the database. It uses `SECURITY DEFINER` to bypass RLS and allow unauthenticated apps to exchange tokens.

**Verification:**

```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'exchange_sso_token';
-- Should return: exchange_sso_token, DEFINER
```

**Security:** The RPC function validates token expiration (5 minutes) and deletes tokens after use (one-time use).

### 2. Environment Variables

Never hardcode credentials:

```typescript
// ❌ Bad - hardcoded credentials
const supabaseUrl = 'https://abc123.supabase.co';
const supabaseKey = 'eyJhbGc...';

// ✅ Good - from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
```

### 3. Anon Key vs Service Role Key

- **Anon Key**: Safe to use in client-side code (limited permissions)
- **Service Role Key**: NEVER use in client-side code (full admin access)

The application should only use the anon key in the frontend.

## Development Tools

### Testing Authentication Locally

1. Create a test user in Supabase Dashboard → Authentication → Users
2. Sign in directly through the `/account` route, or test SSO flow from Hub app
3. For testing SSO flow, navigate from Hub to Trainer:
   - Start Hub app: `http://localhost:5173`
   - Start Trainer app: `http://localhost:3001`
   - Navigate to Trainer from Hub
   - Check browser console for schema-based SSO logs

**Note:** The old postMessage-based SSO has been replaced with schema-based SSO (URL tokens). No iframe/postMessage setup needed.

**Note:** To get valid Supabase tokens for testing, sign in through the Hub app or use Supabase's auth API directly.

## Troubleshooting

### "Supabase client not initialized"

**Cause**: Missing or invalid environment variables

**Solution**:

1. Check `.env.local` exists and contains valid Supabase credentials
2. Restart the dev server after changing environment variables

### "Failed to exchange SSO token" or "Token not found"

**Cause**: Token doesn't exist in database, expired, or RPC function not accessible

**Solution**:

1. Verify RPC function exists:

   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'exchange_sso_token';
   ```

2. Check token exists and isn't expired:

   ```sql
   SELECT * FROM sso_tokens
   WHERE token = 'your-token' AND expires_at > NOW();
   ```

3. Verify RPC function has proper permissions:

   ```sql
   GRANT EXECUTE ON FUNCTION exchange_sso_token(TEXT) TO anon;
   GRANT EXECUTE ON FUNCTION exchange_sso_token(TEXT) TO authenticated;
   ```

4. Check browser console for detailed error messages

### "Error setting session from token"

**Cause**: Invalid or expired access token

**Solution**:

1. Verify the token hasn't expired (check the `expires_at` field)
2. Ensure the token is from the same Supabase project
3. Check that both `access_token` and `refresh_token` are provided in the SSO token
4. Verify the token structure matches `SSOTokenData` interface

## Production Deployment

1. **Set environment variables** in your hosting platform (Vercel, Netlify, etc.)
2. **Configure allowed origins** for your production domains
3. **Enable Row Level Security** in Supabase for all tables
4. **Review Supabase logs** regularly for suspicious activity

## Related Files

- `hooks/useAuth.ts` - Authentication hook (signIn, signOut, signUp)
- `services/SchemaBasedSSO.ts` - Schema-based SSO token exchange and session establishment
- `services/dbService.ts` - Supabase client initialization
- `components/AccountPage.tsx` - Sign-in UI component
- `components/ProtectedRoute.tsx` - Route protection component
- `App.tsx` - SSO initialization using `useSchemaBasedSSO` hook

## Additional Resources

- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Security Best Practices](https://supabase.com/docs/guides/auth/server-side/nextjs)
