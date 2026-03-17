# Trainer App Schema-Based SSO Migration Guide

## Problem

The Trainer app is still using the old postMessage-based SSO, which causes origin mismatch errors:

```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://www.fitcopilot.app')
does not match the recipient window's origin ('http://localhost:5173').
```

## Solution

The Trainer app needs to migrate from `useSSOAuth` (postMessage-based) to `useSchemaBasedSSO` (URL-based).

## Migration Steps

### 1. Update App.tsx (or wherever SSO is initialized)

**Before (postMessage-based):**

```typescript
import { useSSOAuth } from '@/services/hub/SSOReceiver';
import { supabase } from '@/lib/supabase';

function App() {
  const { user, session, isLoading, error } = useSSOAuth(supabase);
  // ...
}
```

**After (schema-based):**

```typescript
import { useSchemaBasedSSO } from '@/services/hub/SchemaBasedSSO';
import { supabase } from '@/lib/supabase';

function App() {
  const { user, session, isLoading, error } = useSchemaBasedSSO(supabase);
  // ...
}
```

### 2. Copy SchemaBasedSSO.ts to Trainer App

Copy the `SchemaBasedSSO.ts` file from the Hub app to the Trainer app:

- Source: `src/services/hub/SchemaBasedSSO.ts` (in Hub app)
- Destination: `src/services/hub/SchemaBasedSSO.ts` (in Trainer app)

### 3. Remove postMessage Code

Remove or comment out:

- `SSOReceiver.ts` initialization
- Any `postMessage` listeners
- `notifyHubReady()` calls

### 4. Verify Token Exchange

The `useSchemaBasedSSO` hook automatically:

- Reads the `sso_token` parameter from the URL
- Exchanges it for a Supabase session
- Cleans up the token from the URL

## How It Works

1. **Hub generates token** → Stores in `sso_tokens` table
2. **Hub redirects to Trainer** → Token in URL (`?sso_token=xxx`)
3. **Trainer reads token from URL** → Calls `exchangeSSOToken()`
4. **Trainer gets Supabase session** → Authenticated!

## Benefits

- ✅ No postMessage errors
- ✅ No cross-origin issues
- ✅ Simpler code
- ✅ Works in dev and production
- ✅ More secure (tokens expire after 5 minutes)

## Testing

1. Start Hub app: `http://localhost:5173`
2. Start Trainer app: `http://localhost:3001` (or configured port)
3. Navigate to Trainer from Hub
4. Check browser console - should see:
   - `✅ Generated SSO token for trainer` (Hub)
   - `✅ Successfully exchanged SSO token for session` (Trainer)
   - No postMessage errors!

## Migration Status

**✅ COMPLETED:** The Trainer app has been successfully migrated to schema-based SSO. The `SSOReceiver.ts` file has been removed and all references updated.

## Rollback

If you need to rollback temporarily, you can:

1. Keep both `useSSOAuth` and `useSchemaBasedSSO` available
2. Use a feature flag to switch between them
3. But postMessage will still have origin mismatch issues in development
