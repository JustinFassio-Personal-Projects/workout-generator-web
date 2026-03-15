# Migration checklist: Main site (aiworkoutgenerator.com) from Next.js to Astro

**Goal:** Switch production traffic for **aiworkoutgenerator.com** (and **www**) from **nextjs-backend** to **astro-site**, so the marketing site is served by Astro. nextjs-backend continues to serve **app.aiworkoutgenerator.com** (signup, login, app APIs).

**Date:** —  
**Owner:** —

---

## Pre-migration

### 1. Astro-site readiness

- [x] **Build:** From repo root or `astro-site/`, run `cd astro-site && npm run build`. Resolve any build errors.  
  _Verified: build completes successfully (static + server output; homepage and SSR routes build)._
- [ ] **Env (production):** In Vercel → **astro-site** project → **Settings** → **Environment Variables**, confirm the following. (Code has defaults where noted; set in Vercel for production.)
  - **Site / app URLs (optional):** `PUBLIC_SITE_URL` (default `https://aiworkoutgenerator.com`), `PUBLIC_APP_URL` (default `https://app.aiworkoutgenerator.com`), `PUBLIC_PROGRAMS_ADMIN_URL` (optional; footer “Admin” link).
  - **Supabase (required for featured content, blog API):** `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
  - **Pricing / Stripe:** `PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM`, `PUBLIC_STRIPE_PAYMENT_LINK_PRO`, `PUBLIC_STRIPE_PAYMENT_LINK_ELITE`, `PUBLIC_STRIPE_PAYMENT_LINK_COACH`, `PUBLIC_STRIPE_PAYMENT_LINK_COACH_PRO` (or fallback behavior in code).
  - **Reports / Turnstile:** `PUBLIC_TURNSTILE_REPORTS_SITE_KEY` (client); `TURNSTILE_REPORTS_SECRET_KEY`, `TURNSTILE_SECRET_KEY` (server); `GEMINI_API_KEY` (reports API).
  - **Analytics (optional):** `PUBLIC_GA_ID`, `PUBLIC_GTM_ID`, `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` (default `https://us.i.posthog.com`).
- [x] **Redirects:** Confirm `astro-site/vercel.json` includes the **redirects** array (68 entries from nextjs-backend). See `astro-site/docs/REDIRECTS_FROM_NEXTJS.md`.  
  _Verified: 68 redirects present; plus 2 for `/generate` (see below)._
- [x] **Rewrites:** Confirm `astro-site/vercel.json` **rewrites** for:
  - `/admin`, `/admin/:path*`, `/api/admin`, `/api/admin/:path*` → `https://aiworkoutgenerator-admin.vercel.app`
  - `/programs`, `/challenges`, `/workouts`, `/exercises`, `/learn` (and `:path*`) → `https://programs.aiworkoutgenerator.com`  
  _Verified: all rewrites present in vercel.json._
- [x] **/generate:** If astro-site has no `/generate` page, add redirect(s) in `vercel.json` so `/generate` and `/generate/:path*` go to `https://app.aiworkoutgenerator.com/generate`.  
  _Done: astro-site has no `/generate` page; added `/generate` and `/generate/:path*` redirects to app in vercel.json._

### 2. Deploy astro-site (no domain change yet)

- [ ] Push changes and ensure the **astro-site** Vercel project has a successful **Production** deployment.
- [ ] Open the astro-site **production URL** (e.g. `astro-site-xxx.vercel.app`) and smoke-test:
  - [ ] Homepage loads.
  - [ ] `/blog`, `/about`, `/faq`, `/equipment`, `/reports` load.
  - [ ] One blog post `/blog/[slug]`, `/onboard`, `/exercise-challenge` load.
  - [ ] `/pricing` redirects to `/#pricing` (or equivalent).
  - [ ] `/login` redirects to `https://app.aiworkoutgenerator.com/login`.
  - [ ] `/programs` (or `/exercises`) is proxied to programs app (no 404).
  - [ ] `/admin` is proxied to admin-dash-astro (login page or dashboard).

### 3. Domain state (current)

- [ ] In **Vercel Dashboard**, note which project currently has **aiworkoutgenerator.com** and **www.aiworkoutgenerator.com** (likely **nextjs-backend**).
- [ ] Ensure **astro-site** project exists and has at least one successful production deploy.

---

## Domain cutover

### 4. Point apex and www to astro-site

1. [ ] **Vercel → astro-site project** → **Settings** → **Domains**.
2. [ ] **Add** `aiworkoutgenerator.com` (apex). Follow Vercel’s instructions (A record or ALIAS/CNAME as indicated).
3. [ ] **Add** `www.aiworkoutgenerator.com`. Vercel usually suggests CNAME to `cname.vercel-dns.com` or the project’s target.
4. [ ] **DNS (your registrar):** Add or update records as Vercel shows. Wait for propagation (minutes to hours).
5. [ ] **Remove** `aiworkoutgenerator.com` and `www.aiworkoutgenerator.com` from the **nextjs-backend** project’s Domains (so they are only on astro-site). If Vercel warns about removing, confirm you’re moving them to astro-site.
6. [ ] **SSL:** Vercel will issue certs for both. Ensure both domains show as verified and “Ready” in astro-site → Domains.

### 5. Optional: nextjs-backend app domain

- [ ] Confirm **app.aiworkoutgenerator.com** remains assigned to the **nextjs-backend** Vercel project (no change needed for this migration).

---

## Post-migration verification

### 6. Critical URLs on aiworkoutgenerator.com

- [ ] **https://aiworkoutgenerator.com** — homepage (Astro).
- [ ] **https://www.aiworkoutgenerator.com** — same or redirects to apex (per your preference).
- [ ] **https://aiworkoutgenerator.com/blog** — blog index.
- [ ] **https://aiworkoutgenerator.com/about** — about.
- [ ] **https://aiworkoutgenerator.com/faq** — FAQ.
- [ ] **https://aiworkoutgenerator.com/onboard** — onboarding.
- [ ] **https://aiworkoutgenerator.com/login** — redirects to app.aiworkoutgenerator.com/login.
- [ ] **https://aiworkoutgenerator.com/register** — redirects to app.aiworkoutgenerator.com/signup.
- [ ] **https://aiworkoutgenerator.com/admin** — proxied to admin-dash-astro (content admin).
- [ ] **https://aiworkoutgenerator.com/programs** — proxied to programs app.
- [ ] **https://aiworkoutgenerator.com/exercises** — proxied to programs app.
- [ ] **https://aiworkoutgenerator.com/learn** — proxied to programs app.

### 7. Redirect sampling

- [ ] **https://aiworkoutgenerator.com/pricing** → `/#pricing`.
- [ ] **https://aiworkoutgenerator.com/how-it-works** → `/#journey`.
- [ ] **https://aiworkoutgenerator.com/category/anything** → `/blog`.
- [ ] **https://aiworkoutgenerator.com/ai-fitness-trainers** → `/blog/ai-fitness-trainers`.
- [ ] **https://aiworkoutgenerator.com/workout-summary/foo** → redirects to `/generate` then to app (via vercel.json).

### 8. SEO / assets

- [ ] **https://aiworkoutgenerator.com/robots.txt** — present and correct.
- [ ] **https://aiworkoutgenerator.com/sitemap.xml** (or sitemap index) — present and includes expected routes.
- [ ] **https://aiworkoutgenerator.com/feed.xml** — RSS/feed if applicable.

---

## Rollback

If critical issues appear after cutover:

1. [ ] **Vercel → nextjs-backend** → **Settings** → **Domains** → **Add** `aiworkoutgenerator.com` and `www.aiworkoutgenerator.com` back.
2. [ ] **DNS:** Point apex and www back to the nextjs-backend project (use the targets Vercel shows for that project).
3. [ ] **Vercel → astro-site** → **Domains** → **Remove** `aiworkoutgenerator.com` and `www.aiworkoutgenerator.com` (to avoid conflict).
4. [ ] Wait for DNS propagation and re-verify on nextjs-backend.

---

## Optional follow-ups

- [ ] **DEPLOYMENT.md:** Update to state that **aiworkoutgenerator.com** is served by **astro-site**; nextjs-backend serves **app.aiworkoutgenerator.com** only (and any tenant domains if still in use).
- [ ] **nextjs-backend:** If it no longer needs to treat `aiworkoutgenerator.com` as a platform domain, you can remove it from `proxy.ts` `PLATFORM_DOMAINS` in a later change (low priority if nextjs-backend no longer receives that host).
- [ ] **Monitoring:** Add or confirm uptime/checks for the main domain and key redirects.

---

## Reference

| Doc | Purpose |
|-----|--------|
| `astro-site/docs/REDIRECTS_FROM_NEXTJS.md` | Full list of 68 redirects and `/generate` note |
| `astro-site/vercel.json` | Redirects + rewrites for astro-site |
| `BLUEPRINT_VERCEL_MONOREPO.md` §4 | Domain strategy and rewrite diagram |
| `DEPLOYMENT.md` | Programs app, admin, www troubleshooting |
