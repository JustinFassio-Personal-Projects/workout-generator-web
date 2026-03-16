# Phase 1: Base URLs & API Configuration

**Context:** [ADMIN_DASH_ASTRO_SITE_PUBLISH_ROADMAP.md](roadmaps/ADMIN_DASH_ASTRO_SITE_PUBLISH_ROADMAP.md) Phase 1 — Verify rewrites and document base URLs for admin-dash-astro → astro-site content publishing.

---

## Base URLs

| Context | Base URL | Notes |
|---------|----------|-------|
| Marketing site (canonical) | `https://aiworkoutgenerator.com` | astro-site; `PUBLIC_SITE_URL` |
| Admin (proxied) | `https://aiworkoutgenerator.com/admin` | Via astro-site rewrites |
| Admin API (proxied) | `https://aiworkoutgenerator.com/api/admin` | Relative fetches from admin UI |
| Exercises (proxied) | `https://aiworkoutgenerator.com/exercises` | Programs app |
| Learn (proxied) | `https://aiworkoutgenerator.com/learn` | Programs app |
| Admin direct (fallback) | `https://aiworkoutgenerator-admin.vercel.app` | admin-dash-astro deployment URL |
| Programs direct (fallback) | `https://programs.aiworkoutgenerator.com` | programs deployment URL |

---

## API URL Guidance

**Use relative URLs** for admin API calls so requests flow through the astro-site proxy when the user is at `aiworkoutgenerator.com/admin`:

- **Correct:** `fetch('/api/admin/programs')`, `fetch('/api/admin/challenges')`
- **Avoid:** Absolute URLs like `fetch('https://aiworkoutgenerator-admin.vercel.app/api/admin/programs')` — these bypass the proxy and can cause CORS or auth issues when the page origin is `aiworkoutgenerator.com`.

admin-dash-astro and programs both use relative URLs in their persistence layers; no code changes needed unless new features introduce absolute base URLs.

---

## Environment Variables

| App | Variable | Purpose |
|-----|----------|---------|
| admin-dash-astro | `PUBLIC_SITE_URL=https://aiworkoutgenerator.com` | "Return to site" link, `ExercisesRedirect` |
| admin-dash-astro | `PUBLIC_ADMIN_BASE_PATH=/admin` | Optional; override admin base path |
| astro-site | `PUBLIC_SITE_URL` | Canonicals, sitemap; default `https://aiworkoutgenerator.com` |
| programs | `PUBLIC_SITE_URL` | Admin link in footer |

---

## Phase 1 Verification Results

**Date:** March 2025

### 1. astro-site `vercel.json` rewrites — ✓ Confirmed

[astro-site/vercel.json](../astro-site/vercel.json) contains the expected rewrites:

- `/admin`, `/admin/:path*` → `https://aiworkoutgenerator-admin.vercel.app/admin` (or `:path*`)
- `/api/admin`, `/api/admin/:path*` → `https://aiworkoutgenerator-admin.vercel.app/api/admin` (or `:path*`)
- `/exercises`, `/exercises/:path*` → `https://programs.aiworkoutgenerator.com/exercises` (or `:path*`)
- `/learn`, `/learn/:path*` → `https://programs.aiworkoutgenerator.com/learn` (or `:path*`)

### 2. Production verification — Requires deployment

Manual production tests:

| URL | Result |
|-----|--------|
| `https://www.aiworkoutgenerator.com/` | ✓ Marketing site loads |
| `https://www.aiworkoutgenerator.com/admin` | 404 (rewrite target not found) |
| `https://www.aiworkoutgenerator.com/exercises` | 404 (rewrite target not found) |
| `https://www.aiworkoutgenerator.com/learn` | Not tested (same pattern) |
| `https://aiworkoutgenerator-admin.vercel.app/admin` | 404 DEPLOYMENT_NOT_FOUND |
| `https://programs.aiworkoutgenerator.com/` | 404 DEPLOYMENT_NOT_FOUND |

**Note:** DNS may redirect `aiworkoutgenerator.com` → `www.aiworkoutgenerator.com`. If the apex domain is served by astro-site and www by another project (e.g. nextjs-backend), ensure the project serving the primary domain has these rewrites. Per [BLUEPRINT_VERCEL_MONOREPO.md](../BLUEPRINT_VERCEL_MONOREPO.md), both apex and www should be on astro-site for `/admin` to work.

**Next steps for production:**
1. Ensure admin-dash-astro and programs are deployed to Vercel with the expected project URLs.
2. Update `astro-site/vercel.json` destination URLs if the deployment URLs differ.
3. Confirm apex and www domains point to the astro-site project so rewrites apply.

**If you see 404 DEPLOYMENT_NOT_FOUND on /exercises, /programs, etc.:** see [TROUBLESHOOTING_PROGRAMS_REWRITES.md](TROUBLESHOOTING_PROGRAMS_REWRITES.md) for step-by-step fix and optional temporary workaround.

---

## Maintaining aiworkoutgenerator.com public URLs (astro-site)

Now that the main marketing site is **astro-site**, users should always see **aiworkoutgenerator.com** (or www) in the browser for these paths:

- **aiworkoutgenerator.com/** — marketing homepage (astro-site)
- **aiworkoutgenerator.com/exercises**, **/learn**, **/programs**, **/challenges**, **/workouts** — content (proxied to programs app)
- **aiworkoutgenerator.com/admin** — content admin (proxied to admin-dash-astro)

To keep these URLs working:

### 1. Primary domain must be served by astro-site

- In **Vercel → astro-site project → Settings → Domains**, ensure **both** are assigned to the **astro-site** project:
  - `aiworkoutgenerator.com`
  - `www.aiworkoutgenerator.com`
- If either domain is assigned to another project (e.g. nextjs-backend), remove it there and add it to astro-site. Otherwise requests to aiworkoutgenerator.com/exercises hit the wrong project and rewrites never run.

### 2. Rewrite destinations must resolve to live deployments

`astro-site/vercel.json` does not change the URL the user sees; it only defines **where** astro-site fetches the response from:

| User visits (stays in browser) | astro-site rewrites to (internal) |
|---------------------------------|-----------------------------------|
| aiworkoutgenerator.com/exercises | programs.aiworkoutgenerator.com/exercises |
| aiworkoutgenerator.com/admin     | aiworkoutgenerator-admin.vercel.app/admin |

So:

- The **rewrite destination** (where astro-site fetches from) must be a live deployment. You can use either:
  - The programs project’s default **\*.vercel.app** URL (e.g. `https://programs-xxx.vercel.app`) — no subdomain or DNS needed; or
  - A custom subdomain **programs.aiworkoutgenerator.com** (add it in **Vercel → programs project → Settings → Domains** and complete DNS).
- Ensure the programs project has at least one successful production deployment. If the destination URL isn’t live, the rewrite returns 404 DEPLOYMENT_NOT_FOUND.
- **aiworkoutgenerator-admin.vercel.app** (or the admin-dash-astro project URL): ensure the admin project is deployed and that URL works; or add a custom domain (e.g. admin.aiworkoutgenerator.com) and point the rewrite to it if you prefer.

### 3. Do not change the public URL

- Keep links and marketing as **aiworkoutgenerator.com/exercises**, **/programs**, **/challenges**, **/learn**, **/workouts**, **/admin**. The rewrites in astro-site make those paths work; no code change is needed for the “main URL” to stay as aiworkoutgenerator.com.
- Only change `vercel.json` **destinations** if you move the programs or admin app to a different Vercel project or domain (then update the destination URLs to match).

### 4. Quick checklist

| Check | Where |
|-------|--------|
| aiworkoutgenerator.com and www → astro-site project | Vercel → astro-site → Domains |
| programs.aiworkoutgenerator.com → programs project, DNS done | Vercel → programs project → Domains |
| Programs app builds and deploys | Vercel → programs project → Deployments |
| Admin app builds and deploys | Vercel → admin-dash-astro project → Deployments |

### 5. SEO: content must declare the main domain

So that search engines see **aiworkoutgenerator.com** (not the rewrite destination) as the canonical URL:

- In the **programs** Vercel project, set **Environment variable**: `PUBLIC_SITE_URL=https://aiworkoutgenerator.com` (Production, and Preview if you want).
- The programs app uses this for `site` in Astro config, so sitemap, robots.txt, and canonical/OG URLs will use aiworkoutgenerator.com when the app is reached via the proxy.
