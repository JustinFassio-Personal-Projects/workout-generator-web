# admin-dash-astro

Astro-based admin dashboard. Scaffolded so you can **copy features one at a time** from `apps/programs` (admin UI + API routes) without merging the full programs app.

- **Port:** 3009
- **Auth:** Supabase; admin check via **`admin_users`** table (same as admin-dash). User must exist in Auth and in `public.admin_users` with `id` = auth user UUID.
- **Routes:** `/` → redirect to `/admin/login`; `/admin/login` (login); `/admin` and `/admin/*` (dashboard SPA, gatekeeper-protected).

## Setup

1. From repo root: `npm install`
2. Copy `.env.example` to `.env` (or `.env.local`) and set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (same Supabase project as admin-dash).
3. Ensure your admin user exists in **Supabase Auth** and in **`admin_users`** (see [docs/ADMIN_USER_SETUP.md](docs/ADMIN_USER_SETUP.md) for SQL and CLI).
4. Run from root: `npm run dev:admin-astro` or from this dir: `npm run dev`.
5. Open http://localhost:3009 → redirects to login. Sign in with the same admin email/password as admin-dash.

## Adding features from programs

Copy in small steps:

1. **API routes** — Copy the endpoints the feature needs from `apps/programs/src/pages/api/admin/` (and `/api/ai/` if needed) into `src/pages/api/` here. Keep the same path structure so the React app’s `fetch` calls work.
2. **React components** — Copy the admin view(s) and any shared components from `apps/programs/src/components/react/admin/` (and dependencies) into `src/components/react/admin/`. Fix imports (`@/` already points at `src/`).
3. **Libs and types** — Copy any `lib/` or `types/` used by those components/APIs.
4. **Dependencies** — Add required packages to this app’s `package.json` (e.g. recharts, dnd-kit, etc.).
5. **Nav and routes** — In `AdminDashboard.tsx`, add a `NavLink` and a `<Route>` for the new section.

See **FEATURES.md** in this directory for a checklist of program features and copy order.
