# Next.js Navbar – Mobile Responsive Behavior & Drawer Audit

**Scope:** `components/landing/Navbar/Navbar.tsx`, `components/ui/Drawer/`, `components/landing/Navbar/Navbar.module.scss`  
**Design tokens:** `styles/design-system/tokens.scss`, `styles/design-system/colors.scss`

---

## 1. Breakpoints

Next.js uses **Tailwind’s default breakpoints** (no overrides in `tailwind.config.ts`):

| Breakpoint | Min width  | Usage in Navbar                                                                                                                                                          |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (default)  | 0px        | Mobile-first base styles                                                                                                                                                 |
| `sm`       | 640px      | Header horizontal padding: `px-4 sm:px-6`                                                                                                                                |
| `md`       | 768px      | Header height: `h-16 md:h-20`; logo scale: `scale-90 md:scale-100`; logo gap: `gap-3 md:gap-4`; subtitle size: `text-[8px] md:text-[10px]`; title: `text-lg md:text-2xl` |
| **`lg`**   | **1024px** | **Primary nav breakpoint:** desktop nav `hidden lg:flex`, mobile menu/drawer `lg:hidden`                                                                                 |

**Primary breakpoint for “desktop vs mobile” is `lg` (1024px).** Below 1024px the inline nav and Sign In are hidden and the “Menu” button is shown; at 1024px and above the full nav bar is shown and the drawer is not used.

---

## 2. Header (Sticky Bar)

- **Sticky:** `sticky top-0 z-50`
- **Height:** `h-16` (64px) on mobile, `md:h-20` (80px) from 768px up
- **Layout:** `max-w-7xl mx-auto px-4 sm:px-6` — container with responsive horizontal padding (16px → 24px at `sm`)
- **Background:** `backdrop-blur-md bg-brand-dark/60` with `border-b border-white/10`
- **Desktop block:** `hidden lg:flex items-center gap-2` — nav links + Sign In only at `lg+`
- **Mobile block:** `flex … lg:hidden` — only the “Menu” button below `lg`

No media queries in `Navbar.module.scss`; layout and visibility are driven by Tailwind classes.

---

## 3. Mobile Menu Button

- **Visibility:** Shown when `lg:hidden` (viewport &lt; 1024px).
- **Markup:** Single `<button>` with “Menu” label.
- **Behavior:** `onClick={toggleDrawer}` toggles `isDrawerOpen`; analytics `trackVercelEvent('Menu Toggle', { action: 'open'|'close', location: 'navbar' })`.
- **A11y:** `aria-label="Open menu"`, `aria-expanded={isDrawerOpen}`.
- **Styling:** `p-2 rounded-full … px-4` — pill-style, matches nav-link look (`bg-slate-800`, `text-slate-400`, `hover:text-brand-green`, `border border-white/10`).

---

## 4. Drawer Component (Mobile Panel)

### 4.1 Usage

- **Component:** `@/components/ui/Drawer/Drawer`
- **Props:** `isOpen={isDrawerOpen}`, `onClose={closeDrawer}`, children = drawer content. No `title` prop in Navbar, so no header/close button is rendered inside the Drawer.
- **When shown:** Only relevant below `lg`; the Drawer is always in the DOM and opened/closed by state. Visibility is not gated by a media query inside the Drawer.

### 4.2 Structure and Order (Next.js source of truth)

Inside the Drawer, content order is:

1. **Sign In** — full-width block: `<div className="w-full mb-4">{signInButton}</div>`
2. **Divider** — `<div className="h-px bg-white/10 my-4"></div>`
3. **Nav links** — vertical list: `<div className="flex flex-col gap-2 w-full">{drawerNavLinks}</div>`  
   (Home, About, Blog, Reports, Deep Research, Equipment, FAQ)

So: **Sign In first, then divider, then the seven nav links.**

### 4.3 Drawer UI Implementation (`Drawer.tsx` + `Drawer.module.scss`)

- **Overlay**
  - Fixed full-screen: `position: fixed; top/left/right/bottom: 0`
  - `background: rgba(0,0,0,0.5)`, `backdrop-filter: blur(4px)`
  - `z-index: var(--z-modal-backdrop)` (1040)
  - Closed: `opacity: 0`, `visibility: hidden`, `pointer-events: none`
  - Open: class `overlay--visible` sets `opacity: 1`, `visibility: visible`, `pointer-events: auto`
  - `transition: opacity/visibility var(--transition-base)` (300ms ease)
  - `onClick={onClose}` to close when clicking backdrop

- **Drawer panel**
  - **Position:** Fixed, left side: `left: 0`, `top: 0`, `height: 100vh`
  - **Width:** `width: 100%` with `max-width: 320px`; at `min-width: 640px` → `max-width: 360px`; at `min-width: 768px` → `max-width: 400px`
  - **Animation:** `transform: translateX(-100%)` when closed, `translateX(0)` when open; `transition: transform var(--transition-base)` (300ms ease)
  - **Visibility:** Closed: `visibility: hidden`, `pointer-events: none`; open: `drawer--open` sets `visibility: visible`, `pointer-events: auto`
  - **Stacking:** `z-index: var(--z-modal)` (1050)
  - **Style:** `background: var(--glass-bg-hover)`, `backdrop-filter: blur(20px)`, `border-right: 1px solid var(--glass-border-hover)`, `box-shadow: var(--shadow-2xl)`
  - **Role:** `role="dialog"`, `aria-modal="true"`, `aria-hidden={!isOpen}`, `tabIndex={-1}`; focus is moved to the drawer when it opens

- **Behavior**
  - **Body scroll:** When `isOpen`, `document.body.style.overflow = 'hidden'`; restored on close.
  - **Escape:** `keydown` listener for `Escape` calls `onClose()`.
  - **Focus:** On open, focus moves to the drawer node; on close, focus is restored to the previously focused element.

- **Content area**
  - `.content`: `flex: 1`, `overflow-y: auto`, `padding: var(--spacing-lg)` (24px), `display: flex`, `flex-direction: column`, `gap: var(--spacing-md)`.

### 4.4 Drawer Breakpoints (width of panel only)

The Drawer panel’s _width_ responds to viewport width; the _decision_ to show the drawer vs desktop nav is entirely in the Navbar at `lg` (1024px):

| Viewport width | Drawer panel max-width |
| -------------- | ---------------------- |
| &lt; 640px     | 320px                  |
| 640px – 767px  | 360px                  |
| ≥ 768px        | 400px                  |

The drawer is only opened by the user below 1024px; above 1024px the “Menu” button is hidden so the drawer is not used.

---

## 5. Link and CTA Behavior

- **Nav links (drawer):** Each link uses `onClick` to call `handleNavClick` (or `handleHomeClick` for Home), which calls `closeDrawer()` then performs navigation/analytics. So the drawer closes on any nav or home click.
- **Sign In (drawer):** Wrapped in the same `signInButton` div; the inner `<a>` has `onClick` that calls `closeDrawer()` before tracking and navigation. So Sign In also closes the drawer.
- **Logo and Home:** Use in-page scroll when pathname is `/`, otherwise full navigation to `/#workout-builder` or `/#hero`; drawer is closed on click.

---

## 6. Summary Table

| Aspect                           | Next.js implementation                                         |
| -------------------------------- | -------------------------------------------------------------- |
| **Desktop vs mobile breakpoint** | `lg` (1024px)                                                  |
| **Header height**                | 64px (&lt; 768px), 80px (≥ 768px)                              |
| **Header padding**               | `px-4` (16px), `px-6` from 640px                               |
| **Mobile trigger**               | Single “Menu” button, `lg:hidden`                              |
| **Mobile panel type**            | Dedicated Drawer component (overlay + sliding panel)           |
| **Panel position**               | Left, slide-in from `translateX(-100%)` → `0`                  |
| **Panel width**                  | 320px (default), 360px @ 640px, 400px @ 768px                  |
| **Overlay**                      | Full-screen, dimmed + blur, click to close                     |
| **Drawer content order**         | 1) Sign In, 2) Divider, 3) Nav links (7)                       |
| **Animation**                    | 300ms ease (opacity/visibility on overlay, transform on panel) |
| **Body scroll lock**             | Yes when drawer open                                           |
| **Escape key**                   | Closes drawer                                                  |
| **Focus management**             | Focus into drawer on open, restore on close                    |

---

## 7. Files Reference

- **Navbar:** `components/landing/Navbar/Navbar.tsx`, `components/landing/Navbar/Navbar.module.scss`
- **Drawer:** `components/ui/Drawer/Drawer.tsx`, `components/ui/Drawer/Drawer.module.scss`
- **Tokens:** `styles/design-system/tokens.scss` (z-index, transition, spacing), `styles/design-system/colors.scss` (glass colors)
- **Tailwind:** `tailwind.config.ts` (no custom breakpoints; defaults: sm 640, md 768, lg 1024, xl 1280, 2xl 1536)
