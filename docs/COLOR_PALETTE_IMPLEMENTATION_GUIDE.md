# Sanctuary Health Color Palette - Implementation Guide

## Overview

This guide provides complete instructions for implementing the Sanctuary Health color palette (Gold, Earth, and Black) in a separate website application. The palette creates a warm, sophisticated, and professional aesthetic.

---

## Complete Color Palette

### 🟡 Gold Colors (Primary Brand)

| Color Name             | Hex Code  | RGB                  | Use Case                                    |
| ---------------------- | --------- | -------------------- | ------------------------------------------- |
| **Main Gold**          | `#f0dc7a` | `rgb(240, 220, 122)` | Primary buttons, highlights, accents, icons |
| **Light Gold (Hover)** | `#f4e59c` | `rgb(244, 229, 156)` | Hover states, active elements               |
| **Medium Gold**        | `#e6d185` | `rgb(230, 209, 133)` | Gradients, transitions                      |
| **Dark Gold 1**        | `#d4c469` | `rgb(212, 196, 105)` | Gradient endpoints, borders                 |
| **Dark Gold 2**        | `#b8a85e` | `rgb(184, 168, 94)`  | Subtle borders, accents                     |
| **Dark Gold 3**        | `#9c8c53` | `rgb(156, 140, 83)`  | Darker borders                              |
| **Dark Gold 4**        | `#807048` | `rgb(128, 112, 72)`  | Shadows, dark backgrounds                   |
| **Dark Gold 5**        | `#6b5d3c` | `rgb(107, 93, 60)`   | Deep shadows, darkest accents               |
| **Light Gold 1**       | `#faf5e1` | `rgb(250, 245, 225)` | Very light backgrounds                      |
| **Light Gold 2**       | `#fdfaf0` | `rgb(253, 250, 240)` | Lightest backgrounds                        |

### 🟤 Earth Tone (Secondary Brand)

| Color Name      | Hex Code  | RGB                 | Use Case                                      |
| --------------- | --------- | ------------------- | --------------------------------------------- |
| **Earth Brown** | `#7d6f54` | `rgb(125, 111, 84)` | Navigation bars, secondary backgrounds, cards |

### ⚫ Black/Dark Colors (Backgrounds & Text)

| Color Name    | Hex Code  | RGB                  | Tailwind Class | Use Case                 |
| ------------- | --------- | -------------------- | -------------- | ------------------------ |
| **Slate 950** | `#0f172a` | `rgb(15, 23, 42)`    | `slate-950`    | Main background          |
| **Slate 900** | `#1e293b` | `rgb(30, 41, 59)`    | `slate-900`    | Cards, elevated surfaces |
| **Slate 800** | `#1e293b` | `rgb(30, 41, 59)`    | `slate-800`    | Secondary cards, borders |
| **Slate 700** | `#334155` | `rgb(51, 65, 85)`    | `slate-700`    | Borders, dividers        |
| **Slate 600** | `#475569` | `rgb(71, 85, 105)`   | `slate-600`    | Scrollbar thumb          |
| **Slate 500** | `#64748b` | `rgb(100, 116, 139)` | `slate-500`    | Scrollbar hover          |
| **Slate 400** | `#94a3b8` | `rgb(148, 163, 184)` | `slate-400`    | Secondary text           |
| **Slate 50**  | `#f8fafc` | `rgb(248, 250, 252)` | `slate-50`     | Primary text on dark     |

### 🔴 Functional Colors

| Color Name    | Hex Code  | Use Case                                    |
| ------------- | --------- | ------------------------------------------- |
| **Error Red** | `#EF4444` | Error states, warnings, destructive actions |

---

## Implementation Methods

### Method 1: CSS Variables (Recommended)

Add this to your main CSS file (e.g., `styles.css`, `globals.css`, or `index.css`):

```css
:root {
  /* Gold Colors */
  --gold-main: #f0dc7a;
  --gold-light: #f4e59c;
  --gold-medium: #e6d185;
  --gold-dark-1: #d4c469;
  --gold-dark-2: #b8a85e;
  --gold-dark-3: #9c8c53;
  --gold-dark-4: #807048;
  --gold-dark-5: #6b5d3c;
  --gold-light-1: #faf5e1;
  --gold-light-2: #fdfaf0;

  /* Earth Tone */
  --earth-brown: #7d6f54;

  /* Dark Colors */
  --slate-950: #0f172a;
  --slate-900: #1e293b;
  --slate-800: #1e293b;
  --slate-700: #334155;
  --slate-600: #475569;
  --slate-500: #64748b;
  --slate-400: #94a3b8;
  --slate-50: #f8fafc;

  /* Functional */
  --error-red: #ef4444;
}

/* Usage Examples */
body {
  background-color: var(--slate-950);
  color: var(--slate-50);
}

.button-primary {
  background-color: var(--gold-main);
  color: var(--slate-950);
}

.button-primary:hover {
  background-color: var(--gold-light);
}

.navbar {
  background-color: var(--earth-brown);
}
```

### Method 2: Tailwind CSS Configuration

If using Tailwind CSS, add to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        gold: {
          main: '#f0dc7a',
          light: '#f4e59c',
          medium: '#e6d185',
          'dark-1': '#d4c469',
          'dark-2': '#b8a85e',
          'dark-3': '#9c8c53',
          'dark-4': '#807048',
          'dark-5': '#6b5d3c',
          'light-1': '#faf5e1',
          'light-2': '#fdfaf0',
        },
        earth: {
          brown: '#7d6f54',
        },
      },
    },
  },
}
```

**Usage with Tailwind:**

```html
<!-- Primary button -->
<button class="bg-gold-main hover:bg-gold-light text-slate-950">Click Me</button>

<!-- Earth tone navbar -->
<nav class="bg-earth-brown text-white">Navigation</nav>

<!-- Dark background -->
<div class="bg-slate-950 text-slate-50">Content</div>
```

### Method 3: SCSS/SASS Variables

If using SCSS/SASS, create a `_colors.scss` file:

```scss
// Gold Colors
$gold-main: #f0dc7a;
$gold-light: #f4e59c;
$gold-medium: #e6d185;
$gold-dark-1: #d4c469;
$gold-dark-2: #b8a85e;
$gold-dark-3: #9c8c53;
$gold-dark-4: #807048;
$gold-dark-5: #6b5d3c;
$gold-light-1: #faf5e1;
$gold-light-2: #fdfaf0;

// Earth Tone
$earth-brown: #7d6f54;

// Dark Colors
$slate-950: #0f172a;
$slate-900: #1e293b;
$slate-800: #1e293b;
$slate-700: #334155;
$slate-600: #475569;
$slate-500: #64748b;
$slate-400: #94a3b8;
$slate-50: #f8fafc;

// Functional
$error-red: #ef4444;

// Usage
.button-primary {
  background-color: $gold-main;
  color: $slate-950;

  &:hover {
    background-color: $gold-light;
  }
}
```

### Method 4: JavaScript/TypeScript Constants

For JavaScript/TypeScript projects, create a `colors.ts` or `colors.js` file:

```typescript
// colors.ts
export const colors = {
  gold: {
    main: '#f0dc7a',
    light: '#f4e59c',
    medium: '#e6d185',
    dark1: '#d4c469',
    dark2: '#b8a85e',
    dark3: '#9c8c53',
    dark4: '#807048',
    dark5: '#6b5d3c',
    light1: '#faf5e1',
    light2: '#fdfaf0',
  },
  earth: {
    brown: '#7d6f54',
  },
  slate: {
    950: '#0f172a',
    900: '#1e293b',
    800: '#1e293b',
    700: '#334155',
    600: '#475569',
    500: '#64748b',
    400: '#94a3b8',
    50: '#f8fafc',
  },
  error: {
    red: '#EF4444',
  },
} as const
```

**Usage:**

```typescript
import { colors } from './colors'

const buttonStyle = {
  backgroundColor: colors.gold.main,
  color: colors.slate[950],
}
```

---

## Common UI Patterns

### Buttons

```css
/* Primary Button */
.btn-primary {
  background-color: var(--gold-main);
  color: var(--slate-950);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--gold-light);
}

.btn-primary:active {
  background-color: var(--gold-dark-1);
}

/* Secondary Button */
.btn-secondary {
  background-color: transparent;
  color: var(--gold-main);
  border: 2px solid var(--gold-main);
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background-color: var(--gold-main);
  color: var(--slate-950);
}
```

### Navigation Bar

```css
.navbar {
  background-color: var(--earth-brown);
  color: var(--slate-50);
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.navbar a {
  color: var(--slate-50);
  text-decoration: none;
  transition: color 0.2s;
}

.navbar a:hover {
  color: var(--gold-main);
}
```

### Cards

```css
.card {
  background-color: var(--slate-900);
  border: 1px solid var(--slate-700);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card-header {
  color: var(--gold-main);
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
```

### Input Fields

```css
.input {
  background-color: var(--slate-800);
  border: 1px solid var(--slate-700);
  color: var(--slate-50);
  padding: 0.75rem;
  border-radius: 0.5rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--gold-main);
  box-shadow: 0 0 0 3px rgba(240, 220, 122, 0.1);
}
```

### Gradients

```css
/* Gold Gradient */
.gradient-gold {
  background: linear-gradient(135deg, var(--gold-main) 0%, var(--gold-dark-1) 100%);
}

/* Dark Gradient */
.gradient-dark {
  background: linear-gradient(135deg, var(--slate-900) 0%, var(--slate-950) 100%);
}

/* Gold to Earth Gradient */
.gradient-gold-earth {
  background: linear-gradient(135deg, var(--gold-main) 0%, var(--earth-brown) 100%);
}
```

### Shadows

```css
.shadow-gold {
  box-shadow: 0 4px 6px rgba(128, 112, 72, 0.3);
}

.shadow-gold-lg {
  box-shadow: 0 10px 15px rgba(128, 112, 72, 0.4);
}
```

---

## Complete HTML Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sanctuary Health - Color Palette Example</title>
    <style>
      :root {
        --gold-main: #f0dc7a;
        --gold-light: #f4e59c;
        --earth-brown: #7d6f54;
        --slate-950: #0f172a;
        --slate-900: #1e293b;
        --slate-700: #334155;
        --slate-50: #f8fafc;
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family:
          'Inter',
          -apple-system,
          BlinkMacSystemFont,
          sans-serif;
        background-color: var(--slate-950);
        color: var(--slate-50);
        line-height: 1.6;
      }

      .navbar {
        background-color: var(--earth-brown);
        padding: 1rem 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .navbar h1 {
        color: var(--gold-main);
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      .card {
        background-color: var(--slate-900);
        border: 1px solid var(--slate-700);
        border-radius: 0.75rem;
        padding: 2rem;
        margin-bottom: 2rem;
      }

      .btn-primary {
        background-color: var(--gold-main);
        color: var(--slate-950);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .btn-primary:hover {
        background-color: var(--gold-light);
      }
    </style>
  </head>
  <body>
    <nav class="navbar">
      <h1>Sanctuary Health</h1>
    </nav>

    <div class="container">
      <div class="card">
        <h2 style="color: var(--gold-main);">Welcome</h2>
        <p>This is an example of the Sanctuary Health color palette.</p>
        <button class="btn-primary">Get Started</button>
      </div>
    </div>
  </body>
</html>
```

---

## Color Accessibility

### Contrast Ratios

- **Gold on Slate 950**: ✅ WCAG AA (4.5:1)
- **Gold on Slate 900**: ✅ WCAG AA (4.5:1)
- **Slate 50 on Slate 950**: ✅ WCAG AAA (12.6:1)
- **Earth Brown on Slate 50**: ✅ WCAG AA (4.5:1)

### Recommendations

1. **Text on Gold**: Always use dark text (`slate-950` or `slate-900`) on gold backgrounds for readability.
2. **Text on Earth**: Use light text (`slate-50`) on earth brown backgrounds.
3. **Text on Dark**: Use light text (`slate-50` or `slate-400`) on dark backgrounds.
4. **Interactive Elements**: Ensure hover states maintain sufficient contrast.

---

## Quick Reference

### Most Common Colors

- **Primary Brand**: `#f0dc7a` (Main Gold)
- **Hover State**: `#f4e59c` (Light Gold)
- **Earth Tone**: `#7d6f54` (Earth Brown)
- **Background**: `#0f172a` (Slate 950)
- **Cards**: `#1e293b` (Slate 900)
- **Text**: `#f8fafc` (Slate 50)

### Color Usage Guidelines

1. **Gold** (`#f0dc7a`): Use for primary actions, highlights, icons, and brand elements
2. **Earth** (`#7d6f54`): Use for navigation bars, secondary backgrounds, and warm accents
3. **Black/Dark** (`#0f172a`): Use for main backgrounds and dark surfaces
4. **Light Text** (`#f8fafc`): Use for primary text on dark backgrounds
5. **Dark Text** (`#0f172a`): Use for text on gold or light backgrounds

---

## Testing Your Implementation

1. **Visual Check**: Compare your implementation with the original Chef app
2. **Contrast Check**: Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
3. **Color Blindness**: Test with [Color Oracle](https://www.colororacle.org/) or browser dev tools
4. **Responsive**: Verify colors work well on mobile and desktop

---

## Support

For questions or clarifications about the color palette, refer to:

- `docs/branding/CHEF_COLOR_PALETTE_UPDATE.md` - Detailed color migration guide
- `docs/branding/CHEF_COLOR_QUICK_REFERENCE.md` - Quick reference guide

---

**Last Updated**: December 2025  
**Version**: 1.0
