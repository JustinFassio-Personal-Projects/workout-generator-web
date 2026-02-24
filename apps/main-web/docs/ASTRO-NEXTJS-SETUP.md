# Astro Frontend & Next.js Backend: Separation and Dev Setup

This document describes how the **Astro** marketing site and **Next.js** app coexist in the same repository, and how to run both in development.

---

## 1. Separation of Both Frameworks

### Overview

The repo is a **monorepo-style** setup with two independent applications:

| Aspect           | Astro (Frontend)                                          | Next.js (Backend / App)                                 |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| **Location**     | `astro-site/`                                             | Root: `app/`, `components/`, `lib/`, `data/`, `public/` |
| **Config**       | `astro-site/astro.config.mjs`, `astro-site/tsconfig.json` | `next.config.js`, root `tsconfig.json`                  |
| **Package**      | `astro-site/package.json` (own `node_modules`)            | Root `package.json`                                     |
| **Port (dev)**   | **4321** (Astro default)                                  | **3001** (explicit in scripts)                          |
| **Build output** | `astro-site/dist/`                                        | `.next/`                                                |
| **TypeScript**   | Excludes root; `@/*` → `./src/*`                          | Root tsconfig **excludes** `astro-site`                 |

They do **not** share runtime: Astro does not call Next.js APIs. Each app has its own API routes and dependencies.

---

### Astro Frontend (`astro-site/`)

- **Purpose:** Marketing/landing site for aiworkoutgenerator.com (hero, blog, FAQ, pricing, about, equipment, founder story, etc.).
- **Stack:** Astro 5, React islands, Tailwind 4, Supabase (blog/leads), Vercel adapter.
- **API routes (Astro):**
  - `astro-site/src/pages/api/blog.ts` — blog list (Supabase).
  - `astro-site/src/pages/api/leads.ts` — lead capture (Turnstile, Supabase).
- **Env:** Uses `PUBLIC_*` (e.g. `PUBLIC_SITE_URL`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_STRIPE_PAYMENT_LINK_*`, `PUBLIC_GA_ID`, `PUBLIC_GTM_ID`). See `astro-site/.env.example`.
- **Deploy:** Static + serverless API routes via `@astrojs/vercel`. `astro-site/vercel.json` rewrites `/admin` and `/api/admin` to the separate admin app.

### Next.js App (Root)

- **Purpose:** App router app (admin, reports, onboarding, generate, etc.) and API backend used by the **Next.js** app itself (and any other consumers you add later).
- **Stack:** Next.js 16, React, Tailwind 3, Supabase, PostHog, BotId, etc.
- **API routes (Next.js):** Under `app/api/` (e.g. `analytics/collect`, `blog`, `leads`, `admin/*`, `reports/gemini-workout`, etc.).
- **Env:** Uses `NEXT_PUBLIC_*` and server-only vars. See root `.env.example`.
- **Port:** Explicitly **3001** in `package.json` (`next dev -p 3001`, `next start -p 3001`).

### What Is Shared vs Separate

- **Shared:** Repo, design/data concepts, Supabase project (each app can use same Supabase URL/keys via its own env).
- **Separate:** Codebases, dependencies, dev servers, build outputs, and API routes. Astro does **not** proxy to or call the Next.js server in the current setup.

---

## 2. How to Start the Dev Servers (Access Both)

You run **two processes**: one for Astro, one for Next.js.

### Option A: Two terminals (recommended)

**Terminal 1 — Astro (marketing site)**

- If you're at **repo root** (e.g. `Workout Generator`): run `cd astro-site`, then the commands below.
- If you're **already inside** `astro-site/` (prompt shows `astro-site %`): run only `npm run dev` — do **not** run `cd astro-site` again (there is no `astro-site` folder inside `astro-site`).

```bash
# From repo root only: go into the Astro app first
cd astro-site

npm install   # if not already done
npm run dev
```

- **URL:** http://localhost:4321
- This serves the Astro marketing site (home, blog, FAQ, pricing, etc.).

**Terminal 2 — Next.js (app/backend)**  
From repo root:

```bash
npm install   # if not already done
npm run dev
```

- **URL:** http://localhost:3001
- This serves the Next.js app (admin, reports, onboarding, etc.).

### Option B: Single terminal (background)

From **repo root** only (not from inside `astro-site/`):

```bash
cd astro-site && npm run dev &
cd .. && npm run dev
```

- Astro: http://localhost:4321
- Next.js: http://localhost:3001

### Quick reference

| App     | Command       | Where to run         | URL                   |
| ------- | ------------- | -------------------- | --------------------- |
| Astro   | `npm run dev` | Inside `astro-site/` | http://localhost:4321 |
| Next.js | `npm run dev` | Repo root            | http://localhost:3001 |

**Tip:** For Astro, run `npm run dev` from the directory that contains `package.json` (i.e. `astro-site/`). If your prompt already shows `astro-site %`, you're in the right place — just run `npm run dev`. Only run `cd astro-site` when you're at the repo root.

There is no single “unified” dev URL that serves both; use the two URLs above. In production, the Astro site is configured for `https://aiworkoutgenerator.com`; the Next.js app may be deployed separately (e.g. different subdomain or project).

---

## 3. Configuration Summary

- **Root `tsconfig.json`:** `exclude` includes `"astro-site"` so the Next.js tooling ignores the Astro app.
- **Root `package.json`:** Scripts (`dev`, `build`, `start`) are for Next.js only; no workspace script for Astro. Run Astro from `astro-site/`.
- **Astro:** `astro-site/package.json` has no reference to the root app. All Astro commands are run from `astro-site/`.
- **Vercel (Astro):** `astro-site/vercel.json` rewrites `/admin` and `/api/admin` to `https://aiworkoutgenerator-admin.vercel.app`.

---

## 4. Environment Files

- **Root:** `.env` / `.env.example` — Next.js (`NEXT_PUBLIC_*`, etc.).
- **Astro:** `astro-site/.env` / `astro-site/.env.example` — Astro (`PUBLIC_*`). Copy and fill as needed for blog, leads, Stripe, GA/GTM.

Each app reads only its own env; there is no shared env file between the two.

---

## 5. Troubleshooting Next.js deployment

### "An error occurred in the Server Components render" (production)

In production, Next.js hides the real error message to avoid leaking sensitive details. To find the cause:

1. **Vercel:** Open your Next.js project → **Logs** (or **Deployments** → select a deployment → **Functions** / **Runtime Logs**). The actual error and stack trace appear in server logs when the failing page or API is requested.
2. **Local production build:** Run `npm run build` at the repo root. If the error happens at build time (e.g. during static generation), it will show locally.
3. **Required env vars for Next.js:** The app expects these in the **Next.js** Vercel project (Settings → Environment Variables). If they are missing, Server Components that use Supabase can throw:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     Set these for admin (auth, blog CRUD, leads, deep-research) and for the public blog when using Supabase. See root `.env.example` for the full list.

The public blog will fall back to static data when Supabase is unavailable or env vars are missing; admin routes require a valid Supabase client and will show an error until the vars are set.
