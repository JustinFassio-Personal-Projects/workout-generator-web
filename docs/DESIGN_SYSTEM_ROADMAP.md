# Design System Roadmap: Monorepo Visual Continuity

This document outlines the phased approach to unifying design across the Workout Generator monorepo. It documents Phase 1 completion and provides detailed plans for Phase 2.

---

## Monorepo Context

| App | Location | Stack | Design Source |
|-----|----------|-------|---------------|
| **programs** | `apps/programs` | Astro, Tailwind v3 | Reference (Space Grotesk, Syncopate, #0d0500) |
| **astro-site** | `astro-site/` (root) | Astro, Tailwind v4, SCSS design-system | Aligned with programs (Phase 1) |
| **admin-dash-astro** | `apps/admin-dash-astro` | Astro, Tailwind | Minimal config |
| **admin-dash** | `apps/admin-dash` | Next.js | TBD |
| **main-web** | `apps/nextjs-backend` | Next.js | TBD |
| **packages/ui** | `packages/ui` | React, clsx, tailwind-merge | Shared Button, Card |

---

## Phase 1: Visual Continuity — COMPLETED

**Goal:** Astro-site looks and feels like programs (fonts, background, headings, scrollbar) without changing token or component architecture.

### Deliverables (All Implemented)

| Deliverable | Status | Implementation |
|-------------|--------|-----------------|
| Self-hosted Space Grotesk + Syncopate | Done | `astro-site/public/fonts/*.woff2` (4 files); `@font-face` in `astro-site/src/styles/global.css` |
| Body font = Space Grotesk | Done | `body { font-family: 'Space Grotesk', sans-serif }` in global.css + globals.scss |
| Headings = Syncopate | Done | `h1–h6`, `.font-heading` in global.css; globals.scss typography block |
| Background #0d0500 | Done | `--bg-dark`, `--bg-gradient-start` in `colors.scss`; body in global.css |
| Scrollbar hidden | Done | `::-webkit-scrollbar { display: none }`, `scrollbar-width: none` in global.css |
| Smooth scroll + scroll-padding-top | Done | `html { scroll-behavior: smooth; scroll-padding-top: 100px }` in global.css |
| .font-heading utility | Done | Added to `astro-site/src/styles/globals.scss` |
| Font CSS variables | Done | `--font-sans`, `--font-display` in BaseLayout; Cinzel kept for about page |

### Files Changed (Phase 1)

- `astro-site/public/fonts/` — 4 woff2 files (copied from programs)
- `astro-site/src/styles/global.css` — @font-face, html/body/heading/scrollbar overrides
- `astro-site/src/layouts/BaseLayout.astro` — Removed Inter/Space Grotesk imports; kept Cinzel; updated font vars
- `astro-site/src/styles/globals.scss` — Body font, heading font-family, removed scrollbar block, added .font-heading
- `astro-site/src/styles/design-system/colors.scss` — `--bg-dark`, `--bg-gradient-start` → #0d0500

### Outcome

Astro-site and programs now share the same visual language (fonts, background, headings, scrollbar). Token and component structure remain unchanged; no shared package introduced.

---

## Phase 2: Two Paths to Deeper Integration

After Phase 1, choose one or both of the following, in order.

---

## Phase 2A: Design-Token Alignment

**Goal:** Same design values everywhere — colors, spacing, typography scale, radius, shadows. One source of truth for numbers.

### Current State

| App | Tokens | Source |
|-----|--------|--------|
| **astro-site** | Full SCSS design-system: `colors.scss`, `tokens.scss`, `animations.scss` | `astro-site/src/styles/design-system/` |
| **programs** | Tailwind theme only (fontFamily, fontWeight); hardcoded #0d0500, #fff in global.css | `apps/programs/tailwind.config.mjs`, `global.css` |
| **admin-dash-astro** | Empty Tailwind extend | `apps/admin-dash-astro/tailwind.config.mjs` |
| **admin-dash, main-web** | TBD | — |

### Implementation Steps

#### 2A.1 Audit and Document

1. **Programs:** Extract all design values from:
   - `apps/programs/tailwind.config.mjs` (fontFamily, fontWeight)
   - `apps/programs/src/styles/global.css` (#0d0500, #fff, scroll-padding 100px)
   - Component-level hardcoded colors (if any)

2. **Astro-site:** Document `astro-site/src/styles/design-system/`:
   - `colors.scss`: --bg-dark, --color-accent, --text-*, --color-primary-*, --color-gray-*, etc.
   - `tokens.scss`: --spacing-*, --font-size-*, --font-weight-*, --radius-*, --shadow-*, --transition-*

3. **Reconcile:** Create a canonical token list. Astro-site is the most complete; use it as the base. Ensure programs values (#0d0500, Space Grotesk, Syncopate) are the source for shared tokens.

#### 2A.2 Define Canonical Tokens

Create a single reference file (e.g. `docs/design-tokens-reference.md` or `astro-site/src/styles/design-system/README.md`) with:

- **Colors:** --bg-dark (#0d0500), --color-accent (#84cc16), --text-primary, etc.
- **Spacing:** --spacing-xs through --spacing-5xl
- **Typography:** --font-size-*, --font-weight-*, --line-height-*
- **Radius:** --radius-sm through --radius-full
- **Shadows:** --shadow-sm through --shadow-glow

#### 2A.3 Update Astro-site

- Astro-site already uses tokens. Verify all components use `var(--*)` instead of hardcoded values.
- Fix any drift (e.g. components using raw hex instead of tokens).

#### 2A.4 Update Programs

- Add a shared tokens CSS file or import from a location programs can consume.
- Options:
  - **A:** Copy `colors.scss` and `tokens.scss` into programs, import in a base layout.
  - **B:** Create `packages/design-tokens` (CSS/SCSS only) and have both astro-site and programs depend on it.
- Update `programs/tailwind.config.mjs` to extend theme from CSS variables:
  ```js
  theme: {
    extend: {
      colors: {
        'bg-dark': 'var(--bg-dark)',
        'accent': 'var(--color-accent)',
        // ...
      },
      fontFamily: { /* keep Syncopate, Space Grotesk */ },
      // spacing, borderRadius, etc. from vars
    },
  },
  ```
- Replace hardcoded #0d0500, #fff in global.css with `var(--bg-dark)`, `var(--text-primary)`.

#### 2A.5 Update admin-dash-astro (Optional)

- Import design tokens.
- Extend Tailwind theme to match.
- Apply Phase 1 base styles (fonts, background, scrollbar) if desired.

### Result

One source of truth for design values. No new package required if using a shared file or copy-in. Can be done app-by-app over 1–2 sprints.

### Best For

Consistency and maintainability without changing repo structure. Lower risk than Phase 2B.

---

## Phase 2B: Shared Design System Package

**Goal:** One package in the monorepo that all apps import (tokens, base styles, optionally components). Phase 1 styles live in this package so they’re defined once.

### Current State

- `packages/ui` exists with React components (Button, Card, clsx, tailwind-merge).
- Astro-site and programs each define fonts, base styles, and tokens independently.
- No shared design tokens package.

### Implementation Steps

#### 2B.1 Create Package Structure

```
packages/
  design-system/           # New package
    package.json
    src/
      tokens.css           # CSS custom properties (colors, spacing, typography, radius, shadows)
      base.css             # @font-face, html/body/heading/scrollbar (Phase 1 styles)
      index.css            # @import tokens + base
    fonts/                 # Or reference public paths; see 2B.2
      space-grotesk-*.woff2
      syncopate-*.woff2
```

- **Package name:** `@workout-generator/design-system` or `design-tokens`
- **Exports:** `package.json` exports `"styles": "./dist/index.css"` or `"./tokens.css"`, `"./base.css"`

#### 2B.2 Font Handling

- **Option A:** Font files live in `packages/design-system/fonts/` and are copied to each app’s `public/fonts/` at build time (via a script or Vite plugin).
- **Option B:** Font files stay in each app’s `public/fonts/`; the package only defines `@font-face` with paths like `/fonts/...` (assumes each app serves fonts from `/fonts/`).
- **Option C:** Single source in `packages/design-system/public/fonts/` and a build step that copies to app output dirs.

Recommendation: **Option B** for minimal change — keep fonts in each app’s public folder; package provides `@font-face` and base CSS. Apps that need fonts ensure they have the woff2 files (copied or symlinked).

#### 2B.3 Extract Tokens

- Move `astro-site/src/styles/design-system/colors.scss` and `tokens.scss` content into `packages/design-system/src/tokens.css` (or SCSS if needed).
- Convert to plain CSS custom properties if using SCSS variables for structure.

#### 2B.4 Extract Base Styles

- Move from `astro-site/src/styles/global.css` and `programs/src/styles/global.css`:
  - `@font-face` (Space Grotesk, Syncopate)
  - `html` (scroll-behavior, scroll-padding-top, scrollbar)
  - `body` (font-family, background, color, overflow)
  - `h1–h6`, `.font-heading` (Syncopate, font-smoothing)

- Package exports `base.css` that apps import before or after Tailwind.

#### 2B.5 Update Apps

- **astro-site:** Import `@workout-generator/design-system` base + tokens; remove duplicated styles from global.css and globals.scss. Keep design-system structure but delegate to package.
- **programs:** Import package base + tokens; remove @font-face and base overrides from global.css. Tailwind config stays; theme can use `var(--*)` from tokens.
- **admin-dash-astro:** Import package; add to Tailwind content if needed.

#### 2B.6 Optional: Shared Components

- Extend `packages/ui` or add `packages/design-system` components (Button, Card, etc.) that use the tokens.
- Ensures UI consistency across React apps. Astro apps can use different patterns (Astro components, or wrap React components).

### Result

Single place to change fonts, colors, spacing for the whole product. New apps start from the same system. Phase 1 styles defined once.

### Best For

Long-term scaling and keeping the monorepo on a consistent design pattern. Higher upfront effort than 2A.

---

## Suggested Order

| Phase | Action | Effort | Risk |
|-------|--------|--------|------|
| **Phase 1** | Done | — | — |
| **Phase 2A** | Token alignment — audit, reconcile, update programs (and optionally admin-dash-astro) | 1–2 sprints | Low |
| **Phase 2B** | Shared package — create package, extract tokens + base, migrate apps | 2–3 sprints | Medium |

**Recommended sequence:** Do Phase 2A first to align tokens and validate the canonical set. Then, if desired, create Phase 2B package and migrate tokens + base into it. Phase 2A can be a stepping stone toward 2B.

---

## Verification Checklist (Phase 1)

- [x] Body: Space Grotesk
- [x] Headings: Syncopate
- [x] Background: #0d0500
- [x] Scrollbar: hidden
- [x] Smooth scroll + scroll-padding-top: 100px
- [x] .font-heading utility
- [x] Cinzel preserved for about page
- [x] Navbar brand uses font-display (Syncopate)

---

## Rollback (Phase 1)

If issues arise: revert the five file groups; restore @fontsource imports in BaseLayout; restore original --font-sans/--font-display. No database or API changes; purely presentational.
