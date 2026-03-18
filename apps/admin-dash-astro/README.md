# admin-dash-astro

Astro-based admin dashboard. Scaffolded so you can **copy features one at a time** from `apps/programs` (admin UI + API routes) without merging the full programs app.

- **Port:** 3009
- **Auth:** Supabase; admin check via **`admin_users`** table (same as admin-dash). User must exist in Auth and in `public.admin_users` with `id` = auth user UUID.
- **Routes:** `/` → redirect to `/admin/login`; `/admin/login` (login); `/admin` and `/admin/*` (dashboard SPA, gatekeeper-protected).

## Setup

1. From repo root: `npm install`
2. Copy `.env.example` to `.env` (or `.env.local`) and set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (same Supabase project as admin-dash and **programs**).
3. Ensure your admin user exists in **Supabase Auth** and in **`admin_users`** (see [docs/ADMIN_USER_SETUP.md](docs/ADMIN_USER_SETUP.md) for SQL and CLI).
4. Run from root: `npm run dev:admin-astro` or from this dir: `npm run dev`.
5. Open http://localhost:3009 → redirects to login. Sign in with the same admin email/password as admin-dash.

## Vercel deployment

In the Vercel project → **Settings → Environment Variables**, set at least:

- **PUBLIC_SUPABASE_URL** — Supabase project URL (same as programs).
- **PUBLIC_SUPABASE_ANON_KEY** — Supabase anon/public key.

Optional: **SUPABASE_SERVICE_ROLE_KEY** for API routes that need to bypass RLS (e.g. admin users list). Without these, the login page may load but sign-in and admin API calls will fail.

**AI (Program Factory, Challenge Factory, Workout Factory):** All use the same Vertex AI config. To use “Generate with AI” (Vertex AI) on Vercel, set:

- **GOOGLE_PROJECT_ID** (or **PUBLIC_FIREBASE_PROJECT_ID**) — GCP project ID. When **GOOGLE_APPLICATION_CREDENTIALS_JSON** is set, the key’s `project_id` is used automatically so Program Factory, Challenge Factory, and Workout Factory all use the same project and permissions.
- **GOOGLE_APPLICATION_CREDENTIALS_JSON** — The **entire** service account key JSON as a single line. Use one key with Vertex AI User in that project for all AI features. Locally you can omit this and use `gcloud auth application-default login` instead.

**403 Permission denied (`aiplatform.endpoints.predict`):** The identity does not have permission to call Vertex AI in the project set in `GOOGLE_PROJECT_ID`. Fix: (1) In Cloud Console → that project → IAM → add the service account (from your key `client_email`) with role **Vertex AI User** (`roles/aiplatform.user`); enable Vertex AI API. (2) Or set `GOOGLE_PROJECT_ID` to the `project_id` inside your service account JSON (the project that owns the key) and ensure Vertex AI is enabled there.

**403 on Generate Deep Dive / Generate User Instructions in production:** If `/api/admin/exercises/[id]/generate-page` or `generate-instructions` return 403 in production but work locally, the cause is usually **Vercel Deployment Protection** on the admin project. When aiworkoutgenerator.com rewrites `/api/admin/*` to this app, Vercel treats the proxied request as unauthenticated and returns 403 before your API runs. **Fix:** In the admin-dash-astro Vercel project → **Settings → Deployment Protection** → disable protection for **Production** (or use “Protection Bypass for Automation” and pass the bypass secret from the requesting app; the app’s own auth remains Supabase + `admin_users`).

## Adding features from programs

Copy in small steps:

1. **API routes** — Copy the endpoints the feature needs from `apps/programs/src/pages/api/admin/` (and `/api/ai/` if needed) into `src/pages/api/` here. Keep the same path structure so the React app’s `fetch` calls work.
2. **React components** — Copy the admin view(s) and any shared components from `apps/programs/src/components/react/admin/` (and dependencies) into `src/components/react/admin/`. Fix imports (`@/` already points at `src/`).
3. **Libs and types** — Copy any `lib/` or `types/` used by those components/APIs.
4. **Dependencies** — Add required packages to this app’s `package.json` (e.g. recharts, dnd-kit, etc.).
5. **Nav and routes** — In `AdminDashboard.tsx`, add a `NavLink` and a `<Route>` for the new section.

See **FEATURES.md** in this directory for a checklist of program features and copy order.

## Programs Landing Page

Programs created in the admin appear on the **programs** app landing page (`/programs`) only when published. Both `admin-dash-astro` and `apps/programs` must connect to the **same Supabase project**. If they use different projects, programs created here will not show on the programs landing page.

### Published program not showing on /programs?

1. **Same Supabase project** — Ensure both apps use the same `PUBLIC_SUPABASE_URL`. Easiest: put `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in **repo root** `.env.local`; both apps load it automatically.
2. **Both dev servers running** — Admin is port 3009; programs landing is port 3006 (`npm run dev:programs`). Visit `http://localhost:3006/programs`.
3. **Publish succeeded** — Confirm the program shows a globe-with-lock (published) icon in the admin library table.
