# Roadmap: Migrate aiworkoutgenerator.com/admin to admin-dash-astro (Live URL)

**Goal:** Change aiworkoutgenerator.com/admin from its current target (programs app or stale admin deployment) so it proxies to **admin-dash-astro** as the live content admin. You are setting admin-dash-astro live on Vercel; this doc is the migration plan.

**Branch:** `update/admin-dash-astro-live-url`

---

## Current vs Target

| Aspect | Current (wrong) | Target |
|--------|------------------|--------|
| **App** | `/admin` and `/api/admin/*` currently rewrite to `https://aiworkoutgenerator-admin.vercel.app`, which may be the **programs** app or an old/unused deployment | **admin-dash-astro** (`apps/admin-dash-astro`) — Astro-based content admin (programs, challenges, workouts, exercises, blog) |
| **Config** | `astro-site/vercel.json` rewrites point to `aiworkoutgenerator-admin.vercel.app` | Same rewrites updated to the **admin-dash-astro** deployment URL (see below) |
| **Footer “Admin” link** | Uses `PUBLIC_PROGRAMS_ADMIN_URL` → when set to programs root, link goes to `programs.aiworkoutgenerator.com/admin` | Prefer linking to `aiworkoutgenerator.com/admin` (main site) so one URL and one app; or set to new admin-dash-astro URL if using a direct domain |

**Two paths in the repo:**

| Path | Purpose |
|------|--------|
| **apps/programs** | Public content app: `/exercises`, `/learn`, `/programs`, `/challenges`, `/workouts`. Has its own `/admin` (Program Factory, etc.) when accessed **directly** at programs.aiworkoutgenerator.com. |
| **apps/admin-dash-astro** | Dedicated content admin: port 3009 locally; Supabase + `admin_users`; routes `/admin/login`, `/admin`, `/admin/*`. Intended to be the app behind **aiworkoutgenerator.com/admin** via astro-site rewrites. |

So: **programs** = content + its own admin when you go to the programs domain. **admin-dash-astro** = the single content admin we want at **aiworkoutgenerator.com/admin**.

---

## Phase 1: Deploy admin-dash-astro to Vercel

**Objective:** Have a live URL for admin-dash-astro that astro-site can proxy to.

### 1.1 Create or reuse Vercel project

- **Option A (recommended):** Use the existing project that has the **aiworkoutgenerator-admin.vercel.app** URL.
  - In that project: **Settings → General → Root Directory** = `apps/admin-dash-astro`.
  - Build/install: use repo root (e.g. `npm install` and `npm run build` from root with filter, or the project’s `vercel.json` if it already has root install/build). See `apps/admin-dash-astro` for any existing Vercel config.
  - Redeploy. The default URL stays `https://aiworkoutgenerator-admin.vercel.app` — no change needed in astro-site if this project was just pointing at the wrong app.
- **Option B:** Create a **new** Vercel project for admin-dash-astro.
  - Root Directory: `apps/admin-dash-astro`.
  - After first deploy, note the deployment URL (e.g. `admin-dash-astro-xxx.vercel.app` or a custom domain you add).

### 1.2 Environment variables (admin-dash-astro project)

Ensure Production (and Preview if desired) has at least:

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (same Supabase as programs)
- `SUPABASE_SERVICE_ROLE_KEY` for admin APIs
- Optional: `PUBLIC_SITE_URL=https://aiworkoutgenerator.com` for “Return to site” and links

See `apps/admin-dash-astro/README.md` and `.env.example` in that app.

### 1.3 Verify direct URL

- Open `https://<admin-dash-astro-url>/admin` (e.g. `https://aiworkoutgenerator-admin.vercel.app/admin` or your new project URL).
- You should see redirect to `/admin/login` and then the admin UI after login (same Supabase + `admin_users` as doc’d in README).

**Deliverable:** admin-dash-astro is live at a known URL and login works when opened directly.

---

## Phase 2: Point astro-site /admin at admin-dash-astro

**Objective:** aiworkoutgenerator.com/admin and aiworkoutgenerator.com/api/admin/* serve admin-dash-astro.

### 2.1 Update rewrites in astro-site

**File:** `astro-site/vercel.json`

- If you used **Option A** (same project, Root Directory changed to admin-dash-astro): no URL change; redeploy astro-site after confirming admin-dash-astro deploy is healthy.
- If you used **Option B** (new project): replace the admin destination host with the new deployment URL.

Current pattern (today):

```json
{
  "source": "/admin",
  "destination": "https://aiworkoutgenerator-admin.vercel.app/admin"
},
{
  "source": "/admin/:path*",
  "destination": "https://aiworkoutgenerator-admin.vercel.app/admin/:path*"
},
{
  "source": "/api/admin",
  "destination": "https://aiworkoutgenerator-admin.vercel.app/api/admin"
},
{
  "source": "/api/admin/:path*",
  "destination": "https://aiworkoutgenerator-admin.vercel.app/api/admin/:path*"
}
```

- **Option A:** Keep as-is; ensure the project behind `aiworkoutgenerator-admin.vercel.app` is admin-dash-astro (Root Directory = `apps/admin-dash-astro`).
- **Option B:** Replace `aiworkoutgenerator-admin.vercel.app` with your new admin-dash-astro URL (e.g. `https://admin-dash-astro-xxx.vercel.app`).

### 2.2 Deploy astro-site

- Commit the change (if any) and push, or trigger a deploy in Vercel.
- Rewrites are applied at the edge; one full deploy is enough.

### 2.3 Smoke test

- Open `https://aiworkoutgenerator.com/admin` (and `https://www.aiworkoutgenerator.com/admin` if you use www).
- Expect: redirect to `/admin/login`, then admin UI after login. No redirect to programs; no 404 from wrong app.
- In the admin UI, trigger an action that calls `/api/admin/*` (e.g. load programs). Requests should succeed (same origin as the page when using relative URLs).

**Deliverable:** aiworkoutgenerator.com/admin and /api/admin/* are served by admin-dash-astro.

---

## Phase 3: Footer “Admin” link and env (optional)

**Objective:** The marketing site footer “Admin” link under Support should go to the correct admin (aiworkoutgenerator.com/admin) and not to programs.

- **Current behavior:** `astro-site/src/components/landing/Footer.astro` uses `PUBLIC_PROGRAMS_ADMIN_URL`. If set to `https://programs.aiworkoutgenerator.com`, the link becomes `programs.aiworkoutgenerator.com/admin` (programs app).
- **Recommended:** Point the link at the main site so one canonical admin URL:
  - Set **astro-site** env `PUBLIC_PROGRAMS_ADMIN_URL=https://aiworkoutgenerator.com` (or `https://www.aiworkoutgenerator.com` if that’s canonical). Then the footer “Admin” link is `aiworkoutgenerator.com/admin` and is proxied to admin-dash-astro.
- **Alternative:** If you add a custom domain for admin-dash-astro (e.g. `admin.aiworkoutgenerator.com`), set `PUBLIC_PROGRAMS_ADMIN_URL=https://admin.aiworkoutgenerator.com` so the link goes direct. Prefer the main-site URL for consistency unless you want a separate bookmarkable admin domain.

Update only if you currently have `PUBLIC_PROGRAMS_ADMIN_URL` set to the programs app; no code change in Footer.astro required.

**Deliverable:** Footer “Admin” goes to aiworkoutgenerator.com/admin (or your chosen canonical admin URL).

---

## Phase 4: Documentation and rollback

### 4.1 Update docs

- **DEPLOYMENT.md** — “Content Admin” / “Programs app and Content Admin”: state that aiworkoutgenerator.com/admin is proxied to **admin-dash-astro** (not programs). Keep programs’ own `/admin` described as the direct programs URL if you still use it.
- **docs/phase1-base-urls.md** — “Admin direct (fallback)” URL: confirm it’s the admin-dash-astro deployment URL (aiworkoutgenerator-admin.vercel.app or new project URL).
- **BLUEPRINT_VERCEL_MONOREPO.md** (if present) — admin row: app = admin-dash-astro, URL = the deployment you use.

### 4.2 Rollback

If something goes wrong:

- Revert `astro-site/vercel.json` to the previous destination URL (or restore Root Directory of the aiworkoutgenerator-admin project to the previous app), redeploy astro-site (and the admin project), and fix forward. No DB or app code change is required for the redirect-only migration.

---

## Checklist (summary)

| Step | Action |
|------|--------|
| 1 | Deploy admin-dash-astro to Vercel (reuse aiworkoutgenerator-admin project with Root Directory `apps/admin-dash-astro`, or new project). |
| 2 | Confirm env vars (Supabase, etc.) in the admin-dash-astro Vercel project. |
| 3 | Verify direct URL: `https://<admin-dash-astro-url>/admin` → login and UI. |
| 4 | If new project: in `astro-site/vercel.json`, set `/admin` and `/api/admin/*` rewrites to the new URL. If same project: ensure project builds admin-dash-astro, then redeploy astro-site. |
| 5 | Deploy astro-site. |
| 6 | Test aiworkoutgenerator.com/admin and www (if used); test an /api/admin call from the admin UI. |
| 7 | (Optional) Set astro-site `PUBLIC_PROGRAMS_ADMIN_URL` to main site so footer “Admin” is aiworkoutgenerator.com/admin. |
| 8 | Update DEPLOYMENT.md and phase1-base-urls (and any blueprint) to say admin = admin-dash-astro. |

---

## References

- **admin-dash-astro:** `apps/admin-dash-astro/README.md`, `apps/admin-dash-astro/.env.example`
- **Rewrites:** `astro-site/vercel.json` (lines 24–39 for admin)
- **Footer:** `astro-site/src/components/landing/Footer.astro` (`PUBLIC_PROGRAMS_ADMIN_URL`)
- **Base URLs:** `docs/phase1-base-urls.md`
- **Publish roadmap:** `docs/roadmaps/ADMIN_DASH_ASTRO_SITE_PUBLISH_ROADMAP.md`
