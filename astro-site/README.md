# Astro site (legacy / optional)

This directory is a **legacy Astro app** and is **not** part of the main production stack.

- **Canonical app**: The root Next.js App Router application is the active front end (run `npm run dev` from the project root).
- This Astro site is excluded from the main `tsconfig.json` and is not built or deployed with the Next.js app.
- It may be kept for reference or occasional use; do not treat it as the primary or conflicting front end.

## Phase 1: Blog (complete)

- **Blog index** (`/blog`) and **blog post** (`/blog/[slug]`) work in Astro with correct data and layout. The index uses `src/lib/blog/queries.ts` (Supabase + fallback), BlogHero, and the BlogIndexClient React island for **search** and **pagination** (10 per page). URL params `?search=` and `?page=` are supported (e.g. tag links from post pages use `/blog?search=...`).
- Meta, canonical, OG, and structured data (Blog + Breadcrumb on index; Article + Breadcrumb on post) are set. Sitemap and feed include blog posts; no regression.
- **Deferred (Phase 1):** Post content placeholders `[GainsSimulator]` and `[HallucinationQuiz]` are not rendered as interactive widgets in Astro; they appear as markdown. Interactive post layout for specific slugs (e.g. `system-vs-random`, `random-workouts-kill-progress`) is not implemented; those posts render as standard articles. Implement in a follow-up if needed.

## When Astro is the canonical front end (Phase 4+)

- **Multi-tenant:** The proxy (or Vercel rewrite) must route tenant-host requests to the Astro app and set the `x-tenant-domain` request header so `src/pages/sites/[domain].astro` can resolve the tenant. Tenant lookup uses `src/lib/multi-tenant/tenant-config.ts` and the Supabase `tenants` table (with optional `PUBLIC_FIREBASE_APP_URL` for the Launch Workout App link).
- **Blog:** Route `/blog` and `/blog/[slug]` to the Astro app so the Astro blog index and post pages are served.
- **Feed, sitemap, robots:** `/feed.xml`, `/sitemap.xml`, `/sitemap-index.xml`, and `/robots.txt` are implemented in Astro and are the canonical URLs for the site. When Astro is the default deploy, these are the single source of truth. BaseLayout already links to `/feed.xml`; crawlers discover `/robots.txt` and the sitemap from it.
- **Redirects:** Root `proxy.ts` contains WordPress and legacy redirects. When the deploy points to Astro, ensure those redirects still run (e.g. proxy in front of Astro or equivalent redirects in Vercel config).
