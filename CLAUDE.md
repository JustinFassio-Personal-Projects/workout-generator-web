# CLAUDE.md — AI Assistant Guide for workout-generator-web

This file contains everything an AI assistant needs to understand and work effectively in this repository.

---

## Repository Overview

**AI Workout Generator** — a fitness web application that generates personalized workout plans. The repo contains **two separate codebases** that expose **three logical apps**:

| Codebase | Root | Apps | URL |
|---|---|---|---|
| **Next.js** | Repo root | Public website + Admin dashboard | `http://localhost:3001` |
| **Astro** | `astro-site/` | Marketing site (separate project) | `http://localhost:4321` |

The Next.js public site and admin share one codebase and one process; they are separated by route paths (`/admin/*`, `/api/admin/*`).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 3 + SCSS Modules
- **Database/Auth**: Supabase (PostgreSQL + Row Level Security)
- **Testing**: Vitest + Testing Library (jsdom environment)
- **Analytics**: PostHog (first-party proxy at `/ingest/*`)
- **Feature Flags**: Statsig via Vercel Flags SDK (`flags/next`) — server-side only
- **Bot Detection**: botid
- **CAPTCHA**: Cloudflare Turnstile (exercise challenge feature)
- **Deployment**: Vercel (two projects — one for Astro, one for Next.js)
- **Code Quality**: ESLint (next/core-web-vitals + prettier), Prettier, Husky pre-commit

---

## Development Workflow

### Setup

```bash
# Install root (Next.js) dependencies
npm install

# Install Astro site dependencies (only when working in astro-site/)
cd astro-site && npm install
```

### Running Dev Servers

```bash
# Next.js (port 3001)
npm run dev

# Astro (port 4321) — run in a separate terminal
cd astro-site && npm run dev
```

### Key Scripts (repo root)

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server (port 3001) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier write (all TS/JS/JSON/SCSS/MD) |
| `npm run format:check` | Prettier check (no write) |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run test:run` | Run all tests once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:critical` | Run only critical tests (blog pages, API routes) |
| `npm run verify` | Lint + type-check + format:check + test:run + build |
| `npm run verify:quick` | Lint + type-check only |

### Pre-commit Hook

Husky runs automatically on every `git commit`:
1. `npm run format` — auto-formats staged files
2. `git add -A` — re-stages formatted files

Do **not** skip this hook. If a commit fails, fix the issue and create a **new** commit (do not `--amend`).

---

## Directory Structure

```
repo root (Next.js codebase)
├── app/                        # Next.js App Router pages and API routes
│   ├── layout.tsx              # Root layout (fonts, analytics, navbar)
│   ├── page.tsx                # Home page
│   ├── globals.scss            # Global styles
│   ├── admin/                  # Admin dashboard pages (/admin/*)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── blog/
│   │   ├── deep-research/
│   │   ├── leads/
│   │   └── login/
│   └── api/                    # API route handlers
│       ├── admin/              # Admin-only APIs (/api/admin/*)
│       │   ├── auth/           # Admin authentication
│       │   ├── blog/           # Blog CRUD
│       │   ├── deep-research/  # Deep research management
│       │   ├── leads/          # Lead management
│       │   ├── revalidate/     # Cache revalidation
│       │   └── upload/         # File uploads
│       ├── analytics/          # Custom analytics ingestion
│       ├── blog/               # Public blog API
│       ├── chatkit-session/    # ChatKit session creation
│       ├── exercise-submissions/ # Exercise challenge submissions
│       ├── leads/              # Lead capture (public)
│       ├── reports/            # Workout reports (Gemini AI)
│       ├── support/            # Support ticket creation
│       └── vision-lead-intel/  # AI lead intelligence
│
├── components/                 # React components
│   ├── admin/                  # Admin UI components
│   ├── analytics/              # Analytics components (PostHog, WebVitals)
│   ├── features/               # Feature-specific components
│   ├── landing/                # Marketing/landing page sections
│   │   ├── Bio/, Blog/, EquipmentAdaptive/, ExerciseChallenge/
│   │   ├── FAQ/, Features/, Footer/, Hero/, Journey/
│   │   ├── Navbar/, OnboardingWizard/, Pricing/
│   │   ├── ScienceChart/, Testimonials/, Videos/
│   │   └── WorkoutPlanBuilder/
│   ├── support/                # Support widget components
│   └── ui/                     # Reusable UI primitives
│       ├── AOSStyles/, Accordion/, Button/, Card/
│       ├── ChatWidget/, Chip/, Drawer/, FAQItems/
│       ├── FlagRestorer/, GroupedFAB/, LogoWatermark/
│       └── ...
│
├── features/                   # Business logic / feature modules
│   ├── analytics/              # Analytics hooks (useScrollTracking)
│   ├── blog/                   # Blog feature (types, hooks, lib)
│   ├── analytics.ts            # PostHog analytics helpers
│   ├── buildEquipmentWizardUrl.ts
│   ├── buildSignupUrl.ts
│   ├── deep-research.ts / deep-research-profile.ts
│   ├── equipmentPreselect.ts
│   ├── exercise-challenge.ts
│   ├── flag-names.ts           # Feature flag name constants (client-safe)
│   ├── flagTracking.ts         # Deprecated flag tracking (backward compat)
│   ├── flags.ts                # Feature flags (SERVER-SIDE ONLY — uses Statsig)
│   ├── multi-tenant/           # Multi-tenant utilities
│   ├── onboarding.ts
│   ├── posthog-server.ts       # Server-side PostHog client
│   ├── rate-limit/             # Rate limiting utilities
│   ├── reports.ts
│   ├── supabase/               # Supabase-related feature helpers
│   ├── useAuthTracking.ts      # Auth tracking hook
│   ├── useSupabaseUser.ts      # Supabase user hook
│   └── validation.ts
│
├── hooks/                      # Shared React hooks
│
├── lib/                        # Core infrastructure / shared utilities
│   ├── admin.ts                # Admin auth utilities
│   ├── analytics.ts            # Analytics utilities
│   ├── blog/                   # Blog queries and utilities
│   ├── buildEquipmentWizardUrl.ts
│   ├── buildSignupUrl.ts
│   ├── deep-research/          # Deep research utilities
│   ├── equipmentPreselect.ts
│   ├── flag-names.ts           # Feature flag names (client-safe)
│   ├── flagTracking.ts
│   ├── flags.ts                # Statsig flag definitions (server-only)
│   ├── multi-tenant/           # Tenant config (domain-based routing)
│   │   └── tenant-config.ts
│   ├── posthog-server.ts
│   ├── rate-limit/             # Rate limiting implementation
│   ├── supabase/               # Supabase client factories
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server component client (SSR)
│   │   ├── admin.ts            # Service-role client (bypasses RLS)
│   │   └── public.ts           # Public client (no cookies)
│   └── validation.ts           # Shared validation helpers
│
├── types/                      # TypeScript type definitions
├── data/                       # Static data (FAQ, pricing, features, etc.)
├── styles/                     # Design system (SCSS tokens, colors, animations)
├── public/                     # Static assets
├── supabase/                   # Supabase migrations and seed
│   ├── migrations/             # SQL migration files
│   └── seed.sql
├── scripts/                    # One-off maintenance scripts
├── docs/                       # Architecture and developer documentation
├── __tests__/                  # Test files (mirror src structure)
│   ├── api/                    # API route tests
│   ├── app/                    # Page tests
│   ├── components/             # Component tests
│   ├── features/               # Feature module tests
│   ├── hooks/
│   ├── lib/
│   └── pages/
├── src/
│   └── test/
│       └── setup.ts            # Vitest global test setup
├── _reference-architecture/    # Reference/example code (not part of production build)
└── astro-site/                 # Separate Astro marketing site (own package.json)
```

---

## Path Aliases

The TypeScript path alias `@/*` maps to the **repo root** in the Next.js codebase:

```ts
// Correct — resolves to repo root
import { createClient } from '@/lib/supabase/client'
import { FLAG_NAMES } from '@/lib/flag-names'
```

In `astro-site/`, `@/*` maps to `./src/*` (defined in `astro-site/tsconfig.json`).

---

## Supabase Setup

Three distinct Supabase client factories exist — use the right one for the context:

| Client | File | Use case |
|---|---|---|
| Browser client | `lib/supabase/client.ts` | Client components, browser-side operations |
| Server client | `lib/supabase/server.ts` | Server components, Route Handlers with session cookies |
| Admin client | `lib/supabase/admin.ts` | Server-only; **bypasses RLS**; never use on client |
| Public client | `lib/supabase/public.ts` | Server-only; no cookies; for `unstable_cache()` |

**Rules:**
- Never import `admin.ts` or `server.ts` in client components
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Use RLS policies for data access control; only bypass with admin client for explicit admin operations

---

## Feature Flags

Feature flags use Statsig via the Vercel Flags SDK.

**Server-side flags** (in Server Components and Route Handlers):
```ts
import { createFeatureFlag } from '@/lib/flags'
// or import specific flags
```

**Client-safe flag names** (constants only, no SDK):
```ts
import { FLAG_NAMES } from '@/lib/flag-names'
```

**Critical rule**: Never import `lib/flags.ts` or `features/flags.ts` in client components. These use `flags/next` which depends on Node.js `async_hooks`. Import from `lib/flag-names.ts` instead.

---

## Admin Authentication

The admin section (`/admin/*`, `/api/admin/*`) uses JWT-based authentication with the JOSE library. Admin sessions are managed via cookies and verified server-side. The admin Supabase client uses the service role key to bypass RLS.

Setup script: `scripts/setup-admin-user.ts`

---

## Prettier Configuration

Prettier runs automatically via the pre-commit hook and is enforced in CI. Settings (`.prettierrc`):

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

Key implications: **no semicolons**, single quotes in JS/TS, double quotes in JSX attributes, no trailing arrow-function parens for single args.

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main` and manual dispatch, using Node 22:

1. `npm run lint` — ESLint
2. `npm run format:check` — Prettier check
3. `npm run type-check` — TypeScript
4. `npm run test:critical` — critical path tests
5. `npm run test:coverage` — full test suite + coverage (must pass 67% threshold)
6. `npm run build` — Next.js production build
7. `npm audit --audit-level=moderate` — security audit (non-blocking)
8. Secrets scan — grep for hardcoded keys in `app/`, `components/`, `features/`
9. Codecov coverage upload

**In CI, env vars default to test stubs** when secrets are not set (e.g. `OPENAI_API_KEY=test-key-for-ci`). Tests are designed to handle these stubs gracefully.

---

## Testing

**Test setup** (`src/test/setup.ts`) provides global mocks for:
- `next/navigation` (useRouter, usePathname, useSearchParams)
- `next/link`
- `next/image`
- `@testing-library/jest-dom/vitest` matchers

**Coverage thresholds**: 67% for lines, functions, branches, and statements.

**What is excluded from coverage** (see `vitest.config.ts`):
- Admin pages and API routes (temporarily — tracked for follow-up)
- Support components
- App router page/layout files (tested via integration/E2E)
- Astro site (separate build)
- Server-only modules that cannot run in jsdom

**Run tests before opening a PR:**
```bash
npm run test:run
npm run test:coverage   # verify 67% thresholds pass
```

**Critical test suite** (fastest, for CI gates):
```bash
npm run test:critical
```

---

## Code Style and Conventions

### TypeScript
- Strict mode is enabled; no `any` types without explicit justification
- Use type imports (`import type`) for type-only imports
- Prefer explicit return types on functions that are part of public APIs

### Component Conventions
- Components live in `components/` organized by domain: `landing/`, `ui/`, `admin/`, etc.
- Each component folder may contain: `ComponentName.tsx`, `ComponentName.module.scss`, and sub-components
- Use SCSS modules for component-scoped styles
- Use Tailwind for utility-based styling

### Naming
- Components: `PascalCase` (e.g., `HeroSection.tsx`)
- Hooks: `camelCase` prefixed with `use` (e.g., `useSupabaseUser.ts`)
- Utility functions: `camelCase`
- API routes: `route.ts` inside `app/api/[route-name]/`
- Test files: `ComponentName.test.tsx` or `functionName.test.ts`

### API Routes
- All admin API routes live under `app/api/admin/` and verify admin JWT before processing
- Public API routes live under `app/api/`
- Always validate inputs; use utilities in `lib/validation.ts`
- Apply rate limiting for public endpoints via `lib/rate-limit/`

### Server vs Client components
- Default to Server Components in App Router; add `'use client'` only when necessary
- Keep data fetching in Server Components; pass data down as props
- Never import server-only modules (`flags/next`, `cookies`, admin Supabase client) in client components

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Required variables:

| Variable | Scope | Required for |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public | Metadata/canonical URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin Supabase client |
| `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` | Public | Chat widget (optional) |
| `OPENAI_API_KEY` | Server only | ChatKit |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | PostHog analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | PostHog host |
| `NEXT_PUBLIC_GA_ID` | Public | Google Analytics (optional) |
| `NEXT_PUBLIC_GTM_ID` | Public | Google Tag Manager (optional) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Cloudflare Turnstile CAPTCHA |
| `TURNSTILE_SECRET_KEY` | Server only | Cloudflare Turnstile verification |
| `FIREBASE_CLOUD_FUNCTION_URL` | Server only | Support ticket creation |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC/PRO/ELITE` | Public | Stripe payment links |

**Security rules:**
- Never commit real secret values to git
- Variables prefixed `NEXT_PUBLIC_` are exposed to the browser — never put secrets there
- `SUPABASE_SERVICE_ROLE_KEY` and `TURNSTILE_SECRET_KEY` must remain server-only

---

## Multi-Tenancy

The app supports white-label tenants served by domain. Tenant configuration is fetched from Supabase and cached for 5 minutes via `unstable_cache`. Key files:

- `lib/multi-tenant/tenant-config.ts` — domain-to-tenant lookup
- `app/sites/` — tenant-specific site rendering

---

## Deployment (Vercel)

Two separate Vercel projects from the same repo:

| Project | Root directory | Domain |
|---|---|---|
| Astro marketing site | `astro-site/` | aiworkoutgenerator.com |
| Next.js (website + admin) | repo root | admin.aiworkoutgenerator.com |

The Astro `vercel.json` has rewrites to proxy `/admin/*` to the Next.js deployment.

See `docs/THREE-APP-ARCHITECTURE.md` and `docs/ASTRO-NEXTJS-SETUP.md` for full deployment details.

---

## MCP / Supabase Integration

```bash
npm run mcp:supabase   # start the Supabase MCP server for AI tooling
```

See `docs/MCP-SUPABASE.md` for configuration details.

---

## Key Documentation

| File | Contents |
|---|---|
| `docs/THREE-APP-ARCHITECTURE.md` | Two-codebase, three-app architecture diagram |
| `docs/ASTRO-NEXTJS-SETUP.md` | Local dev setup and Vercel deployment guide |
| `docs/multi-tenancy/blueprint.md` | Multi-tenancy design |
| `docs/supabase-blog-schema.md` | Blog database schema |
| `docs/statsig-feature-flags.md` | Feature flag setup |
| `docs/vercel-feature-flags-testing.md` | Testing feature flags on Vercel |
| `docs/support-widget-workflow.md` | Support ticket workflow |
| `STRUCTURE.md` | Component architecture overview |
| `SCALABILITY_PLAN.md` | Scalability roadmap |

---

## Common Gotchas

1. **Port**: Next.js dev runs on **3001**, not 3000.
2. **Astro is a separate project**: Always `cd astro-site` and `npm install` separately. Do not mix its dependencies with root.
3. **`lib/flags.ts` is server-only**: Importing it in a client component will cause a build error. Use `lib/flag-names.ts` for flag name constants in client code.
4. **Admin client bypasses RLS**: Only use `lib/supabase/admin.ts` in admin API routes. Never in public-facing code.
5. **Pre-commit auto-formats**: Prettier runs on every commit. Don't fight the formatter — run `npm run format` before committing.
6. **Coverage threshold is 67%**: Tests must pass this threshold for CI to pass. Check with `npm run test:coverage`.
7. **`_reference-architecture/`**: This directory contains example/reference code and is excluded from all builds, tests, and type-checking.
8. **`astro-site/` is excluded from root tsconfig**: Never import from `astro-site/` in the Next.js codebase or vice versa.
9. **PostHog proxy**: Analytics calls route through `/ingest/*` to avoid ad blockers. This is configured in `next.config.js` rewrites.
10. **`unstable_cache` tags must be static**: Dynamic cache tags are not supported. Use `revalidateTag('tenant-config')` for manual invalidation.
