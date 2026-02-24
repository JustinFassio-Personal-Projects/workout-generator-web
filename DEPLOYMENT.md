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
