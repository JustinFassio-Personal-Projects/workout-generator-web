Unified SSO Implementation - Trainer App
Align the Trainer app with the unified SSO architecture by removing insecure client-side JWT verification and implementing server-side validation via Supabase per the official documentation.

Problem
Current implementation (INCORRECT):

Client-side JWT verification using VITE_SUPABASE_JWT_SECRET
Exposes JWT secret in client code (SECURITY RISK)
Token verification failing due to secret mismatches
Violates unified SSO architecture
Correct implementation (per SSO docs):

NO client-side JWT verification
Hub sends Supabase access_token + refresh_token
Trainer calls supabase.auth.setSession() with these tokens
Supabase validates tokens server-side
NO VITE_SUPABASE_JWT_SECRET needed in Trainer app
JWT secret exists ONLY in Hub's Edge Function
Changes Required

1. services/SSOReceiver.ts
   Remove:

Line 6: import \* as jose from 'jose';
Lines 149-192: verifyAndDecodeToken() method (entire method)
Lines 156-162: All JWT secret logic
Add new method:

/\*\*

- Establish Supabase session using SSO tokens
- This is the CRITICAL step - Supabase validates tokens server-side
- NO client-side JWT verification needed!
  \*/
  public async establishSupabaseSession(
  supabaseClient: any,
  tokenData: SSOTokenData
  ): Promise<any> {
  try {
  // Validate that Supabase tokens exist
  if (!tokenData.access_token || !tokenData.refresh_token) {
  console.error('🔐 SSOReceiver: Missing Supabase tokens in SSO data');
  console.error('🔐 SSOReceiver: Expected access_token and refresh_token');
  return null;
  }

      console.log('🔐 SSOReceiver: Establishing Supabase session...');

      // Call Supabase auth.setSession() - validation happens server-side
      const { data, error } = await supabaseClient.auth.setSession({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      });

      if (error) {
        console.error('🔐 SSOReceiver: Failed to establish session:', error);
        return null;
      }

      console.log('✅ SSOReceiver: Session established successfully');
      console.log('✅ SSOReceiver: User authenticated:', data.session?.user.email);

      return data.session;

  } catch (error) {
  console.error('🔐 SSOReceiver: Error establishing session:', error);
  return null;
  }
  }
  Update interface SSOTokenData (lines 8-16):

export interface SSOTokenData {
token: string; // Custom JWT (metadata only - no verification needed)
expires_at: string;
app_access: Record<string, boolean>;
tier: string;
user_id: string;
// 🔑 CRITICAL: Supabase session credentials
access_token: string; // Make required (remove ?)
refresh_token: string; // Make required (remove ?)
} 2. App.tsx
Current code (around lines 27-48):

const userData = await ssoReceiver.verifyAndDecodeToken(tokenData.token);
if (!userData) {
console.error('❌ App.tsx: Failed to verify SSO token');
return;
}

console.log('🔐 SSO Token received:', userData);

// Establish Supabase session
if (tokenData.access_token && tokenData.refresh_token) {
const { data, error } = await supabase.auth.setSession({
access_token: tokenData.access_token,
refresh_token: tokenData.refresh_token,
});

if (error) {
console.error('❌ Failed to set Supabase session:', error);
return;
}

console.log('✅ App.tsx: Supabase session established!', data.session?.user.id);
}
Replace with:

console.log('🔐 App.tsx: SSO token received');

// ⭐ CRITICAL: Establish Supabase session (server-side validation)
const session = await ssoReceiver.establishSupabaseSession(supabase, tokenData);

if (!session) {
console.error('❌ App.tsx: Failed to establish Supabase session');
return;
}

console.log('✅ App.tsx: Supabase session established!', session.user.id);

// Custom JWT metadata available in tokenData if needed (no verification required)
console.log('📊 User metadata:', {
tier: tokenData.tier,
app_access: tokenData.app_access,
user_id: tokenData.user_id
}); 3. env.example
Current content (lines 11-13):

# JWT secret for SSO token verification (shared with Hub app)

# This is used to verify tokens sent from the Hub via postMessage

VITE_SUPABASE_JWT_SECRET=your_jwt_secret_here
Replace entire file with:

# Supabase Configuration

# IMPORTANT: These credentials must match the Hub app exactly

# All apps (Hub, Trainer, Chef) share the same Supabase project

# Your Supabase project URL

VITE_SUPABASE_URL=https://your-project.supabase.co

# Your Supabase anon/public key (safe for client-side use)

VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Hub Configuration (for postMessage origin validation) - PRODUCTION

VITE_HUB_URL=https://fitcopilot.app

# For local development:

# VITE_HUB_URL=http://localhost:5175

# (Optional) Allowed origins for postMessage security

# VITE_EMBEDDED_ALLOWED_ORIGINS=https://fitcopilot.app

# ❌ DO NOT SET VITE_SUPABASE_JWT_SECRET

# JWT secret should NEVER be in client code - it's a SECURITY RISK!

# The JWT secret exists ONLY in the Hub's Edge Function (server-side)

# Token validation happens server-side via Supabase auth.setSession()

# Gemini API Key (for AI workout generation)

GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here 4. vite-env.d.ts
Remove (line 6):

readonly VITE_SUPABASE_JWT_SECRET?: string;
Add:

readonly VITE_HUB_URL?: string; 5. README.md
Update SSO Authentication section (lines 49-72):

Replace current content with:

## SSO Authentication

This app receives authentication tokens from the Hub app via postMessage (cross-domain SSO).

**Key Requirements:**

- **Same Supabase Project**: Must use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the Hub app
- **Server-Side Validation**: All token validation happens via Supabase's auth API (NO client-side JWT verification)
- **Cross-Domain Setup**: App runs in iframe and receives Supabase session tokens via `window.postMessage`
- **Hub URL**: Set `VITE_HUB_URL` for postMessage origin validation

**Authentication Flow:**

1. User signs in to Hub app (once)
2. Hub loads Trainer app in iframe
3. Hub sends SSO token with Supabase `access_token` + `refresh_token` via postMessage
4. Trainer calls `supabase.auth.setSession()` with these tokens
5. Supabase validates tokens server-side and creates session
6. Trainer is now authenticated (no separate sign-in needed)

**Security Model:**

- ✅ **No JWT secret in client code** - JWT secret exists ONLY in Hub's Edge Function
- ✅ **Server-side validation** - Supabase validates all tokens via its auth API
- ✅ **Anon key only** - Clients use only the public anon key
- ✅ **Custom JWT as metadata** - The custom JWT contains user metadata (tier, app_access) but is NOT verified client-side
- ✅ **Origin validation** - postMessage origin checked against `VITE_HUB_URL`

**Verification:**
Open browser console and look for:

- `🔐 SSOReceiver: Received SSO token via postMessage`
- `✅ SSOReceiver: Session established successfully`
- `✅ App.tsx: Supabase session established!`
- Network tab shows `Authorization: Bearer [token]` headers
- NO errors about "JWT secret not configured"

6. services/SSOReceiver.ts - Update postMessage listener
   Update setupPostMessageListener() method (around line 97-121):

Add Hub URL validation from environment:

private setupPostMessageListener(): void {
window.addEventListener('message', (event) => {
// Security: Verify origin from environment variable
const hubUrl = import.meta.env.VITE_HUB_URL;
const allowedOrigins = [
hubUrl,
'https://fitcopilot.app', // Production Hub URL
'http://localhost:5175', // Local Hub dev server
].filter(Boolean); // Remove undefined values

    if (!allowedOrigins.includes(event.origin)) {
      console.log('🔐 SSOReceiver: Ignoring message from unknown origin:', event.origin);
      return;
    }

    const message = event.data as SSOMessage;

    if (message.type === 'SSO_TOKEN' && message.token) {
      console.log('🔐 SSOReceiver: Received SSO token via postMessage');
      this.handleToken(message.token);
    }

});

console.log('🔐 SSOReceiver: postMessage listener set up');
} 7. package.json
Remove jose dependency if not used elsewhere:

Check if jose is imported anywhere else:

grep -r "import.\*jose" src/
If only used in SSOReceiver.ts, remove from package.json:

npm uninstall jose
Implementation Order
Update SSOReceiver.ts
Remove import \* as jose
Remove verifyAndDecodeToken() method
Add establishSupabaseSession() method
Update postMessage origin validation
Update App.tsx
Replace JWT verification with establishSupabaseSession() call
Update console logs
Update environment files
Remove VITE_SUPABASE_JWT_SECRET from vite-env.d.ts
Add VITE_HUB_URL to vite-env.d.ts
Completely rewrite env.example with security warnings
Update README.md
Rewrite SSO Authentication section
Add security model explanation
Update verification steps
Clean up dependencies
Remove jose from package.json if not used elsewhere
Update Vercel environment variables
Remove VITE_SUPABASE_JWT_SECRET from Vercel
Add VITE_HUB_URL=https://www.generateworkout.app
Testing Checklist
Local Testing
Remove VITE_SUPABASE_JWT_SECRET from .env.local
Add VITE_HUB_URL=http://localhost:5175 to .env.local
Run Trainer: npm run dev
Test SSO flow from Hub
Verify console shows:
✅ "Session established successfully"
❌ NO "JWT secret not configured" errors
Production Testing
Remove VITE_SUPABASE_JWT_SECRET from Vercel environment variables
Add VITE_HUB_URL=https://fitcopilot.app in Vercel
Redeploy Trainer app
Test at: https://fitcopilot.app/fitcopilot-trainer
Verify console shows successful session establishment
Verify user profile data loads correctly
Security Verification

# Build and search for JWT_SECRET in client bundle

npm run build
grep -r "JWT_SECRET" dist/

# Expected result: nothing found (secret not in client code)

Security Benefits
No secrets in client bundle - JWT secret only in Hub's Edge Function
Server-side validation - Supabase handles all token validation
Smaller attack surface - No client-side cryptography
Simpler codebase - Remove jose library and verification logic
Better error messages - Supabase provides clear auth errors
Faster builds - Smaller client bundle without crypto libraries
Aligns with Supabase best practices - Using official auth flow
References
For detailed implementation guidance, see:

- docs/SSO_ARCHITECTURE.md - Overall SSO architecture
- docs/SSO_IMPLEMENTATION_GUIDE.md - Step-by-step code implementation
- docs/SSO_DEPLOYMENT_GUIDE.md - Deployment instructions for all apps
- docs/SSO_COHESIVE_IMPLEMENTATION_SUMMARY.md - Quick summary
- docs/HUB_URL_UPDATE_GUIDE.md - Hub URL configuration across services
- src/services/hub/SSOReceiver.ts - Reference implementation (copy to Trainer)

Production Status
🎉 WORKING IN PRODUCTION

- Hub URL: https://fitcopilot.app
- SSO flow functional across Hub, Trainer, and Chef
- Database connections established successfully
- No JWT secrets exposed in client code
- Server-side validation via Supabase auth.setSession()
