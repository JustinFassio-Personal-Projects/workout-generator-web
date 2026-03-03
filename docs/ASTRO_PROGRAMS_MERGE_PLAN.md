# Phased Plan: Merging Programs App with Astro-Site (Admin Dashboard First)

**Goal:** Use the programs app’s admin and content-generation tools with the astro-site, by introducing a single **admin dashboard** at (or behind) the astro-site, then optionally deepen the merge over time.

**Status:** Planning only. No database or schema resets.

---

## 1. Current State

### 1.1 Astro-site (`astro-site/`)

- **Role:** Marketing and content site (aiworkoutgenerator.com).
- **Stack:** Astro 5, React, Vercel adapter, **static** output, Supabase (blog, leads).
- **Routing:** Static pages (index, about, blog, deep-research, equipment, faq, founder-story, onboard/onboarding, reports, story, videos, exercise-challenge).
- **API routes:** `/api/blog`, `/api/leads`, `/api/reports/gemini-workout`.
- **Admin:** None. `robots.txt` already disallows `/admin/` (reserved for future use).
- **Note:** Not in npm workspaces; has its own `package.json` and install.

### 1.2 Programs app (`apps/programs/`)

- **Role:** Workout/program/challenge content app with a full admin for content creation and management.
- **Stack:** Astro 5, React 19, **server** output, Vercel or Node adapter, Supabase (auth + data), PWA, optional Firebase (legacy), custom Express server for non-Vercel prod.
- **Public routes:** `/`, `/workouts`, `/programs`, `/exercises`, `/learn`, `/complexes`, `/interval-timers`, `/tabata`, `/wod`, `/challenges`, `/trainer`.
- **Admin routes (SSR):**
  - `/admin/login` — Supabase auth + `profiles.role === 'admin'`.
  - `/admin` (and `/admin/*`) — SPA shell that loads `AdminDashboard` (React Router); gatekeeper runs `verifyAdminRequest()` in `[...slug].astro`.
- **Admin UI (React SPA under `/admin`):**
  - **Dashboard** — home.
  - **Users** — manage users.
  - **Program Factory** — programs CRUD, blueprint editor, AI generation (architect, chain, extend).
  - **Challenge Factory** — challenges CRUD, images, AI (architect, chain).
  - **Workout Factory** — workouts CRUD, AI (generate workout chain).
  - **WOD Engine** — WOD CRUD and generation.
  - **Warm-Up Engine** — warm-up config.
  - **Exercises** — exercise library, deep-dive editor, biomechanics, video/page generation.
  - **Exercise Visualization Lab** — AI image generation for exercises.
  - **Zones** — zones management.
- **Admin APIs (all under `/api/admin/` or `/api/ai/`):**  
  Workouts, programs, challenges, exercises (CRUD + generate-*, images), users, stats, trainer.  
  Plus **AI endpoints:** generate-architect, generate-blueprint, generate-workout-chain, generate-program-chain, generate-challenge-chain, generate-program, generate-wod, generate-challenge-architect, extend-program, suggest-wod-name, etc.
- **Auth:** Supabase session; admin check via `profiles.role === 'admin'` (see `src/lib/supabase/admin/auth.ts`).

### 1.3 Relationship

- **astro-site** and **programs** are separate apps (different roots, different builds).
- **astro-site** is static-only; **programs** is server-rendered (needed for admin gatekeeper and API routes).
- Both can use the same Supabase project (same content and auth); that’s a configuration choice.

---

## 2. Phase 1: Admin Dashboard for Astro-Site (Primary Goal)

**Objective:** Astro-site gains a single, coherent “admin dashboard” that is the programs app’s admin — either by **routing** to it or by **hosting** it under the same site.

### Option A — Use programs admin via URL (fastest)

**Idea:** Do not copy code. Expose the existing programs admin via a stable URL and link to it from astro-site.

- **Implementation:**
  - Deploy programs as-is (e.g. `programs.aiworkoutgenerator.com` or same domain with path-based routing).
  - On astro-site: add an “Admin” entry (e.g. in footer or a small nav) that links to the programs admin URL (e.g. `https://programs.aiworkoutgenerator.com/admin` or `https://aiworkoutgenerator.com/admin` if you use path rewrites).
- **Path-based routing (same domain):** If both are on Vercel, use `vercel.json` rewrites so that `https://aiworkoutgenerator.com/admin/*` is served by the programs deployment. Then “Admin” can point to `https://aiworkoutgenerator.com/admin`. Users see one domain; cookies and CORS are simpler.
- **Pros:** No code duplication, no change to astro-site build. Reuse all existing admin UI and APIs.
- **Cons:** Two deployments to maintain; env (Supabase, AI keys, etc.) must be aligned for programs; if different domains, cookie/session handling for “Return to Home” and login redirects may need base URL config (`PUBLIC_SITE_URL` / `adminPaths`).

**Deliverables:**

- Document the admin URL and how to open it from astro-site.
- Optional: add “Admin” link on astro-site (e.g. footer) pointing to that URL.
- If same-domain: Vercel (or host) config so `/admin/*` is served by programs.

---

### Option B — Host admin inside astro-site (single app)

**Idea:** Make astro-site the one place that serves both marketing and admin. Copy (or symlink) the admin pages, API routes, and React admin app from programs into astro-site so `/admin` and `/api/admin/*` (and required `/api/ai/*`) live in astro-site.

- **High-level steps:**
  1. **Hybrid output:** Change astro-site to `output: 'hybrid'` and set `prerender: false` for all `/admin` and `/api` routes that come from programs (or that you add). Ensure Vercel (or your host) runs the Node server for those routes.
  2. **Copy into astro-site (surgical):**
     - **Pages:** `src/pages/admin/login.astro`, `src/pages/admin/[...slug].astro`, `src/pages/admin/workouts/[id].astro` (if needed).
     - **API routes:** All of `src/pages/api/admin/**` and the API routes used by admin (e.g. `api/ai/*`, `api/generate-*`, etc.) from programs into astro-site’s `src/pages/api/`.
     - **Components:** The entire `src/components/react/admin/` tree (and any non-admin components they depend on, e.g. `ExerciseImageGenerator`, `AppContext`, layout components).
     - **Lib:** `src/lib/admin/`, `src/lib/supabase/admin/`, and any `src/lib/` used by admin or its APIs (e.g. AI, labels, auth-cookie).
     - **Contexts:** e.g. `AppContext` used by `AdminDashboard`.
  3. **Dependencies:** Add to astro-site’s `package.json`: react-router-dom, and any programs-only deps (e.g. Recharts, DnD, Runway/Vertex if used by admin APIs). Align Supabase client version if needed.
  4. **Env:** In astro-site (and in Vercel), add the same env vars programs uses for admin: Supabase URL/keys, AI/image keys, etc. Do not commit secrets.
  5. **Aliases:** Ensure `@/` points to astro-site’s `src/` in astro-site’s Vite/Astro config.
  6. **Auth:** Keep using Supabase and `profiles.role === 'admin'`. If astro-site already uses Supabase for blog/leads, use the same project so admin and site share auth.
  7. **Robots:** Keep `Disallow: /admin/` in astro-site’s `robots.txt`.
  8. **“Return to Home” / links:** Point “Home” to astro-site’s index (e.g. `/`) and optionally “Mission Control” to programs’ trainer URL if you still run programs for public trainer pages, or to a future trainer route on astro-site.

- **Pros:** One deployment, one domain, one codebase for “the site + admin.”
- **Cons:** Large one-time copy; astro-site becomes heavier and must stay in sync with programs’ admin features until you fully merge (Phase 3) or deprecate the programs app.

**Deliverables:**

- Astro-site build with `output: 'hybrid'`.
- `/admin` and `/admin/*` and all required `/api/admin/*` and `/api/ai/*` (and related) routes implemented in astro-site.
- Admin login and full dashboard working against the same Supabase (and env) you choose.
- README or COMMANDS.md update for “run astro-site” and “open admin at /admin.”

---

### Phase 1 recommendation

- **Short term:** Prefer **Option A** (link or path-based proxy to programs admin). You get a single “admin dashboard” experience (one URL from astro-site) with minimal change and no duplication.
- **Medium term:** If you want one repo and one deploy for marketing + admin, execute **Option B** and treat it as the first step of the full merge (Phase 3). Option B is the right path if “merge with astro-site” means “admin lives in the astro-site codebase.”

---

## 3. Phase 2: Shared Auth and Optional Shared Content

**Objective:** Align identity and, if useful, content between astro-site and programs so the admin dashboard and the public site feel like one product.

- **Shared Supabase project:** Use one Supabase project for both astro-site and programs (auth + `profiles`, blog tables if any, and programs’ tables). Ensures one login and one `profiles.role` for admin.
- **Single sign-on:** If both apps are on the same domain (e.g. via path rewrites), same cookies; if different subdomains, consider shared auth domain or redirect flow so logging in once works for both.
- **Content:** If astro-site’s blog or other content lives in Supabase, you can reuse programs’ admin to manage “content” that astro-site consumes (e.g. same `blog` or `posts` table). No database reset — only wiring and optional new admin views that edit the same tables astro-site reads.

**Deliverables:**

- One Supabase project documented as canonical for both apps.
- Auth flow and cookie/redirect behavior documented (and implemented if not already).
- Optional: small extensions in admin to manage content that astro-site uses (only if you want that).

---

## 4. Phase 3: Full Merge (Single App, Optional)

**Objective:** One Astro app that serves both the current astro-site (marketing) and the current programs app (public programs/workouts/challenges/trainer + admin). No separate “programs” deployment.

- **Approach:** Either:
  - **A)** Merge programs into astro-site: move programs’ public pages, API routes, and remaining libs/components into astro-site; then retire the programs app as a separate deploy; or
  - **B)** Merge astro-site into programs: move astro-site’s pages and components into programs; point the main domain at programs; retire astro-site as a separate deploy.

- **Considerations:**
  - Same Astro config: single `output: 'server'` or `'hybrid'`, one adapter (e.g. Vercel).
  - Shared layout/nav: one navbar that can show “Home / Blog / Reports / …” and “Programs / Workouts / …” and “Admin” (for admins).
  - Port and scripts: one `dev` and one `build`; root `package.json` can have a single `dev:site` or keep `dev:programs` pointing at the merged app.
  - PWA/interval-timers: if programs’ PWA and complex routes matter, keep them in the merged app.
  - Env and secrets: one set of env vars for the merged app.

**Deliverables:**

- Single deployable app containing both marketing and programs content + admin.
- Redirects or path mapping so existing URLs (e.g. programs.example.com vs aiworkoutgenerator.com) still work if needed.
- COMMANDS.md and MONOREPO_INTEGRATION.md updated; programs folder can remain as legacy or be removed once migration is verified.

---

## 5. Summary Table

| Phase   | Focus                         | Outcome |
|--------|--------------------------------|---------|
| **1A** | Use programs admin via URL    | Astro-site links to programs’ `/admin`; optional same-domain rewrites. No code copy. |
| **1B** | Host admin inside astro-site  | Astro-site has `output: 'hybrid'`, `/admin` and `/api/admin` (and required APIs) live in astro-site. |
| **2**  | Shared auth (and optional content) | One Supabase project; consistent login and optional content reuse. |
| **3**  | Full merge                    | One app: marketing + programs public + admin; one deploy. |

---

## 6. What Not to Do

- **Do not reset or recreate databases.** Any merge is wiring and code move only; use existing Supabase (and existing tables) as-is.
- **Do not remove or refactor programs’ admin code** until you’ve decided Phase 1 option and completed it (e.g. if you choose 1B, copy first, then refactor in astro-site if needed).
- **Keep existing code intact** when copying; add or adapt only what’s needed for the merge (surgical edits).

---

## 7. admin-dash-astro (Scaffolded App)

A third approach is to **scaffold a dedicated Astro admin app** and copy features incrementally:

- **App:** `apps/admin-dash-astro` (port **3009**). Run from root: `npm run dev:admin-astro`.
- **Contains:** Login (`/admin/login`), gatekeeper-protected dashboard shell (`/admin`, `/admin/*`), Supabase auth (`profiles.role === 'admin'`), minimal sidebar + placeholder Dashboard home.
- **Process:** Copy features one at a time from `apps/programs`: API routes → React components → libs → add nav + route. See `apps/admin-dash-astro/FEATURES.md` for a checklist and suggested order (Programs → Workouts → Challenges → Exercises → …).

This avoids merging everything into astro-site at once and keeps the admin in a separate, focused app that can later be deployed under the same domain (e.g. path rewrites to `/admin`) or merged into astro-site if desired.

---

## 8. Next Steps

1. **Decide Phase 1 approach:** Option A (link/proxy), Option B (admin in astro-site), or **admin-dash-astro** (scaffolded; copy features incrementally).
2. If **Option A:** Add “Admin” link on astro-site; configure rewrites so `/admin` is served by programs (if same domain); document the URL.
3. If **Option B:** Implement hybrid astro-site and perform the copy of admin pages, API routes, components, and libs as in Section 2; add deps and env; test login and key admin flows.
4. If **admin-dash-astro:** Run `npm run dev:admin-astro`, set Supabase env, then copy features from programs per FEATURES.md (API → components → libs → nav + route).
5. Then proceed to Phase 2 (shared auth/content) and Phase 3 (full merge) only if and when you want to consolidate to a single app.
