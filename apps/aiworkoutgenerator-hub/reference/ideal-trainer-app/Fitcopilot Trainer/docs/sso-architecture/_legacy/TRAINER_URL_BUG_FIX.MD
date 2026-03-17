# URGENT: Trainer App URL Token Bug

**Date**: December 7, 2025  
**Severity**: HIGH  
**Status**: 🔴 BROKEN IN PRODUCTION  
**Location**: Trainer Repository (not Hub)

---

## The Problem

The Trainer app is trying to extract SSO tokens from URL parameters, but it's creating an invalid `SSOTokenData` object:

```typescript
// ❌ BROKEN: URL token extraction in Trainer app
const tokenFromUrl = {
  token: params.get('sso_token'),
  access_token: 'unknown', // ⚠️ PLACEHOLDER VALUE!
  refresh_token: 'unknown', // ⚠️ PLACEHOLDER VALUE!
  // ... other fields
};
```

**What happens:**

1. Trainer app extracts `sso_token` from URL
2. Creates `SSOTokenData` with `access_token: 'unknown'`
3. Calls `establishSupabaseSession()` with these fake tokens
4. Supabase rejects 'unknown' as invalid tokens
5. **Authentication fails completely** ❌

---

## Root Cause

The Trainer app has **two SSO token reception methods** and they're conflicting:

### Method 1: postMessage (✅ CORRECT)

```typescript
// Hub sends via postMessage with REAL Supabase tokens
{
  type: 'SSO_TOKEN',
  token: {
    token: 'eyJhbGc...',           // Custom JWT
    access_token: 'real_token',   // ✅ Real Supabase token
    refresh_token: 'real_token',  // ✅ Real Supabase token
    // ...
  }
}
```

### Method 2: URL Parameters (❌ BROKEN)

```typescript
// Trainer extracts from URL: ?sso_token=eyJhbGc...
// Problem: URL only has custom JWT, NOT Supabase tokens!
{
  token: 'eyJhbGc...',           // Custom JWT from URL
  access_token: 'unknown',       // ❌ FAKE placeholder
  refresh_token: 'unknown',      // ❌ FAKE placeholder
}
```

---

## Why This Worked Before

**Production URLs Changed:**

- **Old Hub URL**: `https://fitcopilot.app`
- **Old Trainer URL**: `https://fitcopilottrainer.app`
- **Old Chef URL**: `https://fitcopilotchef.app`

**Before**: The Hub's origin validation might have been failing silently, causing the Trainer to fall back to URL token extraction (which still didn't work properly but might have had different error handling).

**Now**: With new URLs, the origin validation works, but the URL token extraction code path is getting triggered and breaking authentication.

---

## The Fix (Trainer Repository)

### Option 1: Remove URL Token Extraction (Recommended)

**File**: `services/SSOReceiver.ts` or similar in Trainer app

```typescript
// ❌ REMOVE THIS ENTIRE METHOD:
getTokenFromUrl(): SSOTokenData | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('sso_token');

  if (!token) return null;

  // This creates INVALID token data!
  return {
    token,
    access_token: 'unknown',  // ❌ BREAKS AUTHENTICATION
    refresh_token: 'unknown', // ❌ BREAKS AUTHENTICATION
    // ...
  };
}
```

```typescript
// ✅ ONLY use postMessage for SSO
// Remove all URL token extraction code
// The Hub already sends tokens via postMessage correctly
```

**Why**: SSO tokens should ONLY come via postMessage (secure, origin-validated). URL tokens are insecure and incomplete.

---

### Option 2: Fix URL Token Handling (If Must Keep)

If you MUST support URL tokens (not recommended):

```typescript
// In Trainer app
getTokenFromUrl(): SSOTokenData | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('sso_token');

  if (!token) return null;

  // ❌ DON'T try to establish Supabase session from URL tokens!
  // URL tokens DON'T have access_token/refresh_token

  // ✅ ONLY use URL token for metadata, wait for postMessage
  return {
    token,
    // Mark as incomplete - DO NOT call establishSupabaseSession()!
    access_token: undefined,
    refresh_token: undefined,
    // ... other fields
  };
}
```

**Then in App.tsx or wherever:**

```typescript
// ❌ DON'T DO THIS:
const tokenData = ssoReceiver.getTokenFromUrl();
if (tokenData) {
  // This will fail with 'unknown' tokens!
  await ssoReceiver.establishSupabaseSession(supabase, tokenData);
}

// ✅ DO THIS:
const tokenData = ssoReceiver.getTokenFromUrl();
if (tokenData && !tokenData.access_token) {
  // URL token is incomplete, wait for postMessage
  console.log('Waiting for SSO token via postMessage...');
  // Don't try to establish session yet!
}

// ONLY establish session when receiving via postMessage
window.addEventListener('message', (event) => {
  if (event.data.type === 'SSO_TOKEN') {
    const fullTokenData = event.data.token;
    // ✅ This has REAL access_token and refresh_token
    await ssoReceiver.establishSupabaseSession(supabase, fullTokenData);
  }
});
```

---

## Immediate Fix Steps (Trainer Repository)

### 1. Locate the Bug

```bash
# In Trainer repository
grep -r "access_token.*unknown" src/
grep -r "getTokenFromUrl" src/
grep -r "sso_token.*URLSearchParams" src/
```

### 2. Choose Fix Option

**Recommended**: Remove URL token extraction entirely (Option 1)

- SSO tokens ONLY via postMessage
- More secure
- Simpler code
- Matches Hub implementation

**Alternative**: Fix URL token handling (Option 2)

- Keep URL token extraction for metadata only
- Don't try to establish session from URL tokens
- Wait for postMessage with complete tokens

### 3. Verify Hub Is Sending Tokens Correctly

**The Hub is already correct!** It sends tokens via postMessage:

```typescript
// Hub's FitcopilotTrainer.tsx (ALREADY CORRECT)
ssoService.sendTokenToIframe(iframeRef.current, targetOrigin, ssoToken);

// This sends:
{
  type: 'SSO_TOKEN',
  token: {
    token: 'eyJhbGc...',
    access_token: 'REAL_SUPABASE_TOKEN',  // ✅ Real token
    refresh_token: 'REAL_SUPABASE_TOKEN', // ✅ Real token
    tier: 'free',
    app_access: { trainer: true },
    // ...
  }
}
```

**No changes needed in Hub!**

---

## Test After Fix

### Local Testing

```bash
# 1. Apply fix in Trainer repository
# 2. Run Trainer locally: npm run dev
# 3. Run Hub locally: npm run dev
# 4. Set environment variables:

# Hub .env:
VITE_EXTERNAL_TRAINER_URL=http://localhost:3001

# Trainer .env:
VITE_HUB_URL=http://localhost:5175

# 5. Test SSO flow:
# - Log into Hub
# - Navigate to /fitcopilot-trainer
# - Check console for:
#   ✅ "Received SSO token via postMessage"
#   ✅ "Supabase session established"
#   ❌ NO "unknown" tokens
#   ❌ NO "Invalid credentials" errors
```

### Production Testing

```bash
# 1. Deploy Trainer with fix
# 2. Update Trainer URL in Hub config if needed:

# Hub Vercel env vars:
VITE_EXTERNAL_TRAINER_URL=https://fitcopilottrainer.app/

# 3. Update Hub URL in Trainer config:
VITE_HUB_URL=https://fitcopilot.app

# 4. Test at: https://fitcopilot.app/fitcopilot-trainer
# 5. Verify authentication works
```

---

## Hub Configuration Update Needed

Since you've updated URLs, verify the Hub has the correct Trainer URL:

### File: `src/config/index.ts` (Hub Repository)

```typescript
export const EXTERNAL_TRAINER_URL =
  import.meta.env.VITE_EXTERNAL_TRAINER_URL || 'https://fitcopilottrainer.app/'; // ✅ Updated URL
```

### Vercel Environment Variables (Hub)

```bash
# Update in Vercel Dashboard > Hub Project > Settings > Environment Variables
VITE_EXTERNAL_TRAINER_URL=https://fitcopilottrainer.app/
VITE_EXTERNAL_CHEF_URL=https://fitcopilotchef.app/
```

---

## Quick Fix Summary

### In Trainer Repository

1. **Find**: URL token extraction code
2. **Remove**: `getTokenFromUrl()` method
3. **Remove**: Any code that calls `establishSupabaseSession()` with URL tokens
4. **Keep**: postMessage listener that receives complete SSO tokens
5. **Test**: Verify SSO works via postMessage only

### In Hub Repository

1. **Update**: `EXTERNAL_TRAINER_URL` to `https://fitcopilottrainer.app/`
2. **Update**: `EXTERNAL_CHEF_URL` to `https://fitcopilotchef.app/`
3. **Update**: `SSO_ALLOWED_ORIGINS` to include new URLs
4. **Deploy**: Push changes to Vercel

---

## Example Working Code (Trainer App)

### ❌ Before (Broken)

```typescript
// In Trainer app initialization
useEffect(() => {
  // Try URL first
  const urlToken = ssoReceiver.getTokenFromUrl();
  if (urlToken) {
    // ❌ BREAKS: urlToken has access_token: 'unknown'
    establishSupabaseSession(supabase, urlToken);
  }

  // Setup postMessage listener
  ssoReceiver.setupMessageListener(handleToken);
}, []);
```

### ✅ After (Fixed)

```typescript
// In Trainer app initialization
useEffect(() => {
  // ✅ ONLY use postMessage for SSO
  const cleanup = ssoReceiver.setupMessageListener(async (message) => {
    if (message.type === 'SSO_TOKEN' && message.token) {
      // ✅ This has REAL Supabase tokens
      const session = await ssoReceiver.establishSupabaseSession(supabase, message.token);

      if (!session) {
        console.error('Failed to establish session');
        navigate('/auth');
      }
    }
  });

  return cleanup;
}, []);
```

---

## Related Files to Check

### Trainer Repository Files:

- `services/SSOReceiver.ts` - URL token extraction
- `App.tsx` - SSO initialization
- `AuthContext.tsx` - Session management
- `.env` - `VITE_HUB_URL` configuration

### Hub Repository Files (Already Correct):

- ✅ `src/routes/FitcopilotTrainer.tsx` - Sends tokens via postMessage
- ✅ `src/services/hub/SSOService.ts` - Token generation
- ⚠️ `src/config/index.ts` - Update EXTERNAL_TRAINER_URL

---

## Success Criteria

✅ Trainer app ONLY receives SSO tokens via postMessage  
✅ No URL token extraction attempts  
✅ `establishSupabaseSession()` receives real Supabase tokens  
✅ Authentication works in production  
✅ Console shows `"Supabase session established"`  
✅ No `"unknown"` or placeholder tokens  
✅ Hub URLs updated to new domains

---

**CRITICAL**: This fix must be made in the **Trainer repository**, not the Hub. The Hub is already sending tokens correctly via postMessage.
