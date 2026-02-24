# Deployment (Vercel + Turborepo)

This monorepo has multiple deployable apps. Each needs its own Vercel project with **Root Directory** set correctly.

## Vercel project setup

| App        | Root Directory   | Notes                                      |
|-----------|-------------------|---------------------------------------------|
| main-web  | `apps/main-web`   | Main marketing/workout app                  |
| admin-dash| `apps/admin-dash` | Admin dashboard (blog, leads, analytics)    |

**Required:** In each Vercel project → **Settings** → **General** → set **Root Directory** to the app path above. Without this, Vercel looks for `.next` at the repo root and fails with `routes-manifest.json` not found.

The `vercel.json` in each app configures `buildCommand` and `installCommand` to run from the monorepo root so Turborepo builds correctly.

**If you see "No Output Directory named 'dist' found":** In **Settings** → **Build & Development Settings**, set **Framework Preset** to **Next.js** and clear **Output Directory** (leave empty). Next.js uses `.next`, not `dist`.

## admin-dash: Production login

**If you see "Admin login is not configured. Set ADMIN_PASSWORD in env." in production:**

1. Open the **admin-dash** Vercel project (not main-web).
2. Go to **Settings** → **Environment Variables**.
3. Add **ADMIN_PASSWORD** (or **ADMIN_SECRET**) with a strong value (at least 16 characters).
4. Enable it for **Production** (and **Preview** if you want login on preview deployments).
5. Redeploy so the new variable is available.

**If you get 307 redirect to /admin/login when visiting /admin (cookie not persisting):**

1. Ensure **admin.aiworkoutgenerator.com** (or your admin domain) is assigned to the **admin-dash** Vercel project in **Settings** → **Domains**.
2. Log in at `https://admin.aiworkoutgenerator.com/admin/login` (use the exact domain you'll access admin from).
3. Clear cookies for the domain and try again; stale or wrong-domain cookies can block the new one.
4. In DevTools → Application → Cookies, confirm `__Secure-sb-admin-session` is set for your admin domain after login.
