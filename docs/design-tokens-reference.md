# Design Tokens Reference

Canonical list of CSS custom properties used across the monorepo for design consistency. **Source of truth:** `@workout-generator/design-system` package (`packages/design-system/src/tokens.css`). All apps consume these values by importing the package.

---

## Colors

### Background
| Token | Value | Usage |
|-------|-------|--------|
| `--bg-dark` | #0d0500 | Primary page background |
| `--bg-dark-secondary` | #111827 | Secondary surfaces |
| `--bg-gradient-start` | #0d0500 | Gradient start |
| `--bg-gradient-end` | #1a1f35 | Gradient end |

### Text
| Token | Value | Usage |
|-------|-------|--------|
| `--text-primary` | #ffffff | Headings, primary copy |
| `--text-secondary` | rgba(255,255,255,0.8) | Body, secondary copy |
| `--text-tertiary` | rgba(255,255,255,0.6) | Muted copy |
| `--text-muted` | rgba(255,255,255,0.4) | Placeholders, captions |

### Accent (Lime)
| Token | Value |
|-------|-------|
| `--color-accent` | #84cc16 |
| `--color-accent-light` | #a3e635 |
| `--color-accent-dark` | #65a30d |

### Primary (Green)
| Token | Value |
|-------|-------|
| `--color-primary-50` … `--color-primary-900` | #f0fdf4 … #14532d |

### Orange / Chart (programs UI)
| Token | Value | Usage |
|-------|-------|--------|
| `--color-orange-light` | #ffbf00 | CTAs, highlights |
| `--color-orange` | #ffa500 | Primary chart |
| `--color-orange-medium` | #ff8000 | Medium orange |
| `--color-orange-dark` | #ff4000 |
| `--color-orange-darkest` | #ff1500 |

### Error
| Token | Value |
|-------|-------|
| `--color-error` | #ef4444 |
| `--color-error-light` | #f87171 |
| `--color-error-dark` | #dc2626 |

### Gray
| Token | Value |
|-------|-------|
| `--color-gray-50` … `--color-gray-950` | #f9fafb … #030712 |

### Glass
| Token | Value |
|-------|-------|
| `--glass-bg-base` | rgba(25,33,51,0.6) |
| `--glass-bg-hover` | rgba(25,33,51,0.8) |
| `--glass-border-base` | rgba(132,204,22,0.15) |
| `--glass-border-hover` | rgba(132,204,22,0.3) |
| `--glass-border-accent` | rgba(132,204,22,0.5) |

---

## Spacing

| Token | Value |
|-------|-------|
| `--spacing-xs` | 0.25rem (4px) |
| `--spacing-sm` | 0.5rem (8px) |
| `--spacing-md` | 1rem (16px) |
| `--spacing-lg` | 1.5rem (24px) |
| `--spacing-xl` | 2rem (32px) |
| `--spacing-2xl` | 3rem (48px) |
| `--spacing-3xl` | 4rem (64px) |
| `--spacing-4xl` | 6rem (96px) |
| `--spacing-5xl` | 8rem (128px) |

---

## Typography

### Font size
| Token | Value |
|-------|-------|
| `--font-size-xs` | 0.75rem |
| `--font-size-sm` | 0.875rem |
| `--font-size-base` | 1rem |
| `--font-size-lg` … `--font-size-7xl` | 1.125rem … 4.5rem |

### Font weight
| Token | Value |
|-------|-------|
| `--font-weight-light` | 300 |
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |
| `--font-weight-extrabold` | 800 |

### Line height
| Token | Value |
|-------|-------|
| `--line-height-tight` | 1.25 |
| `--line-height-snug` | 1.375 |
| `--line-height-normal` | 1.5 |
| `--line-height-relaxed` | 1.625 |
| `--line-height-loose` | 2 |

---

## Radius

| Token | Value |
|-------|-------|
| `--radius-sm` | 0.25rem |
| `--radius-md` | 0.5rem |
| `--radius-lg` | 0.75rem |
| `--radius-xl` | 1rem |
| `--radius-2xl` | 1.5rem |
| `--radius-full` | 9999px |

---

## Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` … `--shadow-2xl` | Standard elevation |
| `--shadow-glass` | 0 8px 32px rgba(0,0,0,0.37) |
| `--shadow-glow` | 0 0 20px rgba(132,204,22,0.3) |

---

## Transitions

| Token | Value |
|-------|-------|
| `--transition-fast` | 150ms ease |
| `--transition-base` | 300ms ease |
| `--transition-slow` | 500ms ease |
| `--transition-slower` | 700ms ease |

---

## Z-Index

| Token | Value |
|-------|-------|
| `--z-base` … `--z-tooltip` | 0 … 1070 |

---

## Layout

| Token | Value |
|-------|-------|
| `--navbar-height` | 80px |
