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
