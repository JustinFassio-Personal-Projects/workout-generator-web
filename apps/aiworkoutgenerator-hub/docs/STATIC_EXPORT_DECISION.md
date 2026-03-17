# Static Export Architecture Decision

## Current Configuration

This project is configured with **static export** (`output: "export"` in `next.config.ts`).

## What Static Export Enables

✅ **Benefits:**

- Simple static hosting on Firebase Hosting (no Cloud Functions/Cloud Run needed)
- Lower hosting costs (static files only served from CDN)
- Fast CDN delivery worldwide
- No cold starts or server management
- Better for SEO with pre-rendered content

## What Static Export Disables

❌ **Limitations:**

- **No API Routes** - `/app/api/*` routes will NOT work
- **No Server-Side Rendering (SSR)** - All rendering happens at build time or client-side
- **No Dynamic Routes with Fallback** - All dynamic routes must be known at build time
- **No Incremental Static Regeneration (ISR)** - Cannot regenerate pages after deployment
- **No Server Actions** - Cannot use Next.js server actions
- **No Middleware** - Cannot use Next.js middleware for auth/redirects

## Current Implementation

The Hub app currently:

- ✅ Uses Firebase Auth (client-side) - **Works with static export**
- ✅ Uses Firestore (client-side) - **Works with static export**
- ✅ Has onboarding flow (client-side) - **Works with static export**
- ⚠️ Blueprint describes API routes - **NOT compatible with static export**

## Architectural Implications

### If Keeping Static Export

**You MUST:**

- Remove all planned API routes from blueprint
- Use Firebase Cloud Functions for server-side operations:
  - Stripe webhook handling → Firebase Cloud Function
  - Workout generation → Firebase Cloud Function + Genkit
  - SSO token exchange → Firebase Cloud Function
- Move all server-side logic to Firebase Cloud Functions
- Use Firebase callable functions instead of API routes

**Example Migration:**

```typescript
// ❌ NOT POSSIBLE with static export
// app/api/workouts/generate/route.ts

// ✅ USE INSTEAD with static export
// functions/src/generateWorkout.ts
export const generateWorkout = onCall(async (request) => {
  // Server-side logic here
});
```

### If Switching to SSR/Hybrid

**Remove static export to enable:**

- API routes in `/app/api/*`
- Server-side rendering
- Dynamic features
- Deploy to:
  - Firebase Cloud Run (recommended)
  - Vercel (recommended)
  - Firebase Hosting + Cloud Functions (complex)

**Change needed:**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Remove or comment out:
  // output: "export",
};
```

## Recommendation

Based on the blueprint.md plans for API routes, Stripe webhooks, and SSO token exchange, we recommend:

**Option 1: Switch to SSR (Recommended for this project)**

- Remove `output: "export"` from next.config.ts
- Deploy to Vercel or Firebase Cloud Run
- Keep API routes as planned in blueprint
- Simpler architecture for features planned

**Option 2: Keep Static Export + Firebase Functions**

- Keep `output: "export"`
- Remove all API route plans from blueprint
- Migrate server-side logic to Firebase Cloud Functions
- More complex but fully serverless

## Decision Required

**Please choose one option and update:**

1. `next.config.ts` - Remove or keep `output: "export"`
2. `blueprint.md` - Update architecture section to match decision
3. This document - Add final decision and date

---

**Decision Made:** Option 1 - SSR/Hybrid Mode (Static export DISABLED)  
**Date:** 2025-12-31  
**Decided By:** Architecture review

**Rationale:** The project has 7 API routes implementing core functionality:

- `/api/workouts/generate` - AI workout generation with Genkit
- `/api/workouts/generate-images` - Exercise image generation
- `/api/image/generate` - Single image generation endpoint
- `/api/admin/images` - Master image library management
- `/api/stripe/checkout` - Stripe checkout session creation
- `/api/stripe/portal` - Stripe customer portal
- `/api/webhooks/stripe` - Stripe webhook handling

Static export is incompatible with API routes. Deploying as SSR app to Vercel or Firebase Cloud Run.
