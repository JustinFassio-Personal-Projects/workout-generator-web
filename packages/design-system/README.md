# @workout-generator/design-system

Shared design tokens, base styles, and animations for the Workout Generator monorepo.

## Contents

- **tokens.css** — CSS custom properties (colors, spacing, typography, radius, shadows, transitions, z-index). See `docs/design-tokens-reference.md`.
- **base.css** — `@font-face` (Space Grotesk, Syncopate), html/body/heading/scrollbar styles.
- **animations.css** — Keyframes and `.animate-*` utility classes.

## Usage

Import the full bundle (recommended):

```css
import '@workout-generator/design-system';
```

Or import subpaths:

```css
import '@workout-generator/design-system/tokens';
import '@workout-generator/design-system/base';
import '@workout-generator/design-system/animations';
```

**Import order:** Import the design-system **before** Tailwind (or app global CSS that uses Tailwind) so `var(--*)` tokens are available when Tailwind compiles.

## Fonts

Base styles reference fonts at `/fonts/`:

- `space-grotesk-v22-latin-400.woff2`
- `space-grotesk-v22-latin-700.woff2`
- `syncopate-v24-latin-400.woff2`
- `syncopate-v24-latin-700.woff2`

Each consuming app must serve these files from `public/fonts/` (or equivalent). Copy from `apps/programs/public/fonts/` if needed.

## Source of truth

This package is the single source of truth for design tokens. `docs/design-tokens-reference.md` documents the canonical list and should be updated when tokens change here.
