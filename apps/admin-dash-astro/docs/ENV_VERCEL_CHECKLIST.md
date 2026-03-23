# admin-dash-astro: Environment Variables Checklist

## Required for All Analytics (Auth, Engagement, Retention, Monetization)

| Variable | Purpose | Vercel | Firebase |
|----------|---------|--------|----------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. https://qbklyimfazrkutwqictw.supabase.co) | ✅ Set | N/A |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ Set | N/A |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth funnel `listUsers`, admin operations | ✅ Set | N/A |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Retention cohorts, monetization candidates, hub signups | ⚠️ **Add if missing** | N/A (server-side) |

## Firebase Service Account

- **Source**: Firebase Console → Project Settings → Service Accounts → Generate new private key
- **Project**: Use `ai-workout-generator-hub` (hub project)
- **Account**: `firebase-adminsdk-fbsvc@...` (Firebase Admin SDK)
- **Permissions**: Service account needs **Cloud Datastore User** (or Firebase Admin) to read `user_activity_logs`
- **Format**: Full JSON on a single line. No surrounding quotes in Vercel (or our parser will strip them).

## Vercel admin-dash-astro – Current vs Required

Based on your Vercel dashboard paste, you have:
- ✅ `PUBLIC_SUPABASE_URL`
- ✅ `PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `FIREBASE_CLOUD_FUNCTION_URL`
- ✅ `PUBLIC_STRIPE_PAYMENT_LINK_*`, `PUBLIC_GA_ID`, `PUBLIC_TURNSTILE_SITE_KEY`
- ✅ `STATSIG_SERVER_API_KEY`, `PUBLIC_CHATKIT_WORKFLOW_ID`

**Add to Vercel** (if not already set):
- **`FIREBASE_SERVICE_ACCOUNT_KEY`** — Required for Retention cohorts + Monetization candidates. Paste the full JSON (same value as in `.env.local`).

## .env vs .env.local

- **`.env`**: Shared base; loadable by all apps. Gitignored.
- **`.env.local`**: Local overrides (e.g. Supabase keys). Takes precedence. Gitignored.
- **Vercel**: Set vars in Project → Settings → Environment Variables. No `.env` files in deployment.
