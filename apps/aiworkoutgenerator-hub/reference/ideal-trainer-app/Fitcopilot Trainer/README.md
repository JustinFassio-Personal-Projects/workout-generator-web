<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Tr0Qp01Iw3s5CaH5BnDR27R-enW140rQ

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up Supabase database:
   - Run the database migrations to create required tables
   - See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions
   - Quick version: Run `supabase_schema.sql` in Supabase SQL Editor

3. Set up environment variables:
   - Copy `env.example` to `.env.local`:
     ```bash
     cp env.example .env.local
     ```
   - Update `.env.local` with your credentials:

     ```env
     # Supabase Configuration (must match Hub app)
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGci...

     # Hub URL (for postMessage origin validation)
     VITE_HUB_URL=https://fitcopilot.app

     # Gemini API Key
     GEMINI_API_KEY=your_gemini_api_key_here
     VITE_GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. Run the app:
   ```bash
   npm run dev
   ```

## SSO Authentication

This app uses schema-based SSO (URL-based token exchange) for cross-domain authentication with the Hub app.

**Key Requirements:**

- **Same Supabase Project**: Must use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the Hub app
- **Server-Side Validation**: All token validation happens via Supabase's auth API (NO client-side JWT verification)
- **Cross-Domain Setup**: Hub redirects to Trainer with SSO token in URL parameter
- **RPC Function**: Database must have `exchange_sso_token` function (shared with Chef app)

**Authentication Flow:**

1. User signs in to Hub app (once)
2. Hub generates SSO token and stores it in `sso_tokens` table
3. Hub redirects to Trainer app with `?sso_token=xxx` in URL
4. Trainer reads token from URL and calls `exchange_sso_token` RPC function
5. RPC function returns Supabase `access_token` + `refresh_token`
6. Trainer calls `supabase.auth.setSession()` with these tokens
7. Supabase validates tokens server-side and creates session
8. Trainer is now authenticated (no separate sign-in needed)
9. Token is cleaned from URL and deleted from database (one-time use)

**Security Model:**

- ✅ **No JWT secret in client code** - JWT secret exists ONLY in Hub's Edge Function
- ✅ **Server-side validation** - Supabase validates all tokens via its auth API
- ✅ **Anon key only** - Clients use only the public anon key
- ✅ **RPC function bypasses RLS** - Uses `SECURITY DEFINER` to allow token exchange
- ✅ **One-time use tokens** - Tokens are deleted after exchange
- ✅ **Token expiration** - Tokens expire after 5 minutes

**Verification:**
Open browser console and look for:

- `✅ [DEBUG] useSchemaBasedSSO: Token captured immediately on mount`
- `🔐 SchemaBasedSSO: Attempting RPC function (bypasses RLS)...`
- `✅ SchemaBasedSSO: Token exchanged via RPC function`
- `✅ SchemaBasedSSO: Successfully exchanged SSO token for session`
- `✅ App.tsx: User authenticated via schema-based SSO`
- Network tab shows `Authorization: Bearer [token]` headers
- NO postMessage errors

## Production Deployment

When deployed, this Trainer app is embedded in the Hub at:

- **Hub URL**: https://fitcopilot.app/fitcopilot-trainer
- **Trainer URL**: https://fitcopilot-trainer.vercel.app/

The Hub app redirects to the Trainer with an SSO token in the URL, which is exchanged for a Supabase session via the `exchange_sso_token` RPC function.
