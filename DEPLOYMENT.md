# Deployment (Vercel + Turborepo)

This monorepo has multiple deployable apps. Each needs its own Vercel project with **Root Directory** set correctly.

## Vercel project setup

| App        | Root Directory   | Notes                                      |
|-----------|-------------------|---------------------------------------------|
| nextjs-backend  | `apps/nextjs-backend`   | APIs, admin proxy target, legacy routes (not the primary marketing site)    |
| admin-dash| `apps/admin-dash` | Admin dashboard (blog, leads, analytics)    |
| programs  | `apps/programs`   | Workout/program/challenge content app; full admin at `/admin` (Program Factory, Challenge Factory, etc.). See **Programs app and Content Admin** below. |

**Required:** In each Vercel project → **Settings** → **General** → set **Root Directory** to the app path above. Without this, Vercel looks for `.next` at the repo root and fails with `routes-manifest.json` not found.

**After renaming nextjs-backend:** If this app was previously deployed with Root Directory `apps/main-web`, update the Vercel project → **Settings** → **General** → **Root Directory** to `apps/nextjs-backend` so builds continue to work.

**If the build fails with "The specified Root Directory 'apps/main-web' does not exist":** Open the Vercel project that deploys the old main-web app → **Settings** → **General** → **Root Directory**. Change `apps/main-web` to `apps/nextjs-backend` and save. Trigger a new deploy.

The `vercel.json` in each app configures `buildCommand` and `installCommand` to run from the monorepo root so Turborepo builds correctly.

**Build command:** The app lives in `apps/nextjs-backend` but the **package name** is `main-web` so Turborepo and Vercel's default/cached build command (`--filter=main-web`) build this app without changing Framework settings.

**If you see "No Output Directory named 'dist' found":** In **Settings** → **Build & Development Settings**, set **Framework Preset** to **Next.js** and clear **Output Directory** (leave empty). Next.js uses `.next`, not `dist`.

## admin-dash: Production login

**If you see "Admin login is not configured. Set ADMIN_PASSWORD in env." in production:**

1. Open the **admin-dash** Vercel project (not nextjs-backend).
2. Go to **Settings** → **Environment Variables**.
3. Add **ADMIN_PASSWORD** (or **ADMIN_SECRET**) with a strong value (at least 16 characters).
4. Enable it for **Production** (and **Preview** if you want login on preview deployments).
5. Redeploy so the new variable is available.

**If you get 307 redirect to /admin/login when visiting /admin (cookie not persisting):**

1. Ensure **admin.aiworkoutgenerator.com** (or your admin domain) is assigned to the **admin-dash** Vercel project in **Settings** → **Domains**.
2. Log in at `https://admin.aiworkoutgenerator.com/admin/login` (use the exact domain you'll access admin from).
3. Clear cookies for the domain and try again; stale or wrong-domain cookies can block the new one.
4. In DevTools → Application → Cookies, confirm `__Secure-sb-admin-session` is set for your admin domain after login.

## Programs app and Content Admin

The **programs** app (`apps/programs`) provides the content admin (programs, workouts, challenges, exercises, WOD, etc.). Deploy it as its own Vercel project with **Root Directory** `apps/programs`.

- **Programs app root URL:** Set by your programs deployment (e.g. `https://programs.aiworkoutgenerator.com`).
- **Content Admin URL:** `{programs-root}/admin` (e.g. `https://programs.aiworkoutgenerator.com/admin`). Login at `/admin/login`; access requires Supabase auth and `profiles.role === 'admin'`.

**Opening the Content Admin from the marketing site (astro-site):** Set `PUBLIC_PROGRAMS_ADMIN_URL` in the astro-site Vercel project (or local `.env`) to the programs app root (e.g. `https://programs.aiworkoutgenerator.com`). The astro-site footer then shows an **Admin** link under Support that goes to `{PUBLIC_PROGRAMS_ADMIN_URL}/admin`. If the variable is unset, the link is hidden. The main site’s `/admin` path is proxied to **admin-dash-astro** (content admin) via astro-site rewrites.

**Programs app: 500 Internal Server Error on GET /**  
1. **Monorepo build:** Ensure `apps/programs/vercel.json` exists with `installCommand` and `buildCommand` that run from the repo root (e.g. `cd ../.. && npm install` and `cd ../.. && npx turbo run build --filter=programs`). Without this, workspace packages may not resolve and the server can throw at runtime.  
2. **Vercel logs:** In the programs Vercel project, go to Deployments, select the deployment, then Functions or Runtime Logs. Reproduce the 500 and check the serverless function logs for the actual error.  
3. **Env vars:** The app needs at least `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in the programs project (Settings → Environment Variables). Add any missing variables for Production, then redeploy.

## nextjs-backend: "Site Not Found – This tenant site does not exist"

If the nextjs-backend deployment URL (e.g. `nextjs-backend-xxx.vercel.app`) shows this error, the proxy was treating the hostname as a tenant domain. Ensure `proxy.ts` treats `*.vercel.app` and `app.aiworkoutgenerator.com` as platform domains (no tenant rewrite). After deploy, the homepage should load.

## www.aiworkoutgenerator.com/admin returns 404

If `https://www.aiworkoutgenerator.com/admin` returns 404, the domain may be assigned to the wrong project:

1. **Check Vercel Domains:** Vercel Dashboard → astro-site → Settings → Domains. Both `aiworkoutgenerator.com` and `www.aiworkoutgenerator.com` should be assigned to astro-site.
2. **Fix domain assignment:** If `www.aiworkoutgenerator.com` is on nextjs-backend, remove it and add it to astro-site. All marketing traffic (including www) should go through astro-site so its rewrites proxy `/admin` to admin-dash-astro.
3. **Fallback:** nextjs-backend has rewrites for `/admin` and `/api/admin` that proxy to admin-dash-astro. If www must stay on nextjs-backend, those rewrites will make `/admin` work; prefer moving www to astro-site for consistency.
