# Sanctuary Health Color Palette - Quick Reference

## 🎨 Essential Colors

### Primary Brand Colors

```css
--gold-main: #f0dc7a; /* Primary buttons, highlights, accents */
--gold-light: #f4e59c; /* Hover states */
--earth-brown: #7d6f54; /* Navigation bars, secondary backgrounds */
--slate-950: #0f172a; /* Main background */
--slate-900: #1e293b; /* Cards, elevated surfaces */
--slate-50: #f8fafc; /* Primary text on dark */
```

## 📋 Copy-Paste CSS Variables

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
```

## 🎯 Common Use Cases

| Element            | Background | Text Color |
| ------------------ | ---------- | ---------- |
| Primary Button     | `#f0dc7a`  | `#0f172a`  |
| Button Hover       | `#f4e59c`  | `#0f172a`  |
| Navigation Bar     | `#7d6f54`  | `#f8fafc`  |
| Main Background    | `#0f172a`  | `#f8fafc`  |
| Card Background    | `#1e293b`  | `#f8fafc`  |
| Input Field        | `#1e293b`  | `#f8fafc`  |
| Input Focus Border | `#f0dc7a`  | -          |

## 🚀 Quick Start Examples

### HTML + CSS

```html
<button
  style="background-color: #f0dc7a; color: #0f172a; padding: 0.75rem 1.5rem; border-radius: 0.5rem;"
>
  Click Me
</button>
```

### Tailwind CSS

```html
<button class="bg-[#f0dc7a] hover:bg-[#f4e59c] text-slate-950 px-6 py-3 rounded-lg">
  Click Me
</button>
```

### React/JSX with Inline Styles

```jsx
<button
  style={{
    backgroundColor: '#f0dc7a',
    color: '#0f172a',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
  }}
>
  Click Me
</button>
```

## 📱 Complete Example

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      :root {
        --gold-main: #f0dc7a;
        --gold-light: #f4e59c;
        --earth-brown: #7d6f54;
        --slate-950: #0f172a;
        --slate-900: #1e293b;
        --slate-50: #f8fafc;
      }
      body {
        background: var(--slate-950);
        color: var(--slate-50);
        font-family: sans-serif;
        padding: 2rem;
      }
      .navbar {
        background: var(--earth-brown);
        padding: 1rem;
        margin-bottom: 2rem;
      }
      .card {
        background: var(--slate-900);
        padding: 2rem;
        border-radius: 0.5rem;
      }
      .btn {
        background: var(--gold-main);
        color: var(--slate-950);
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
      }
      .btn:hover {
        background: var(--gold-light);
      }
    </style>
  </head>
  <body>
    <nav class="navbar">Sanctuary Health</nav>
    <div class="card">
      <h2 style="color: var(--gold-main);">Welcome</h2>
      <button class="btn">Get Started</button>
    </div>
  </body>
</html>
```

## 🔗 Full Documentation

For complete implementation instructions, see:

- **[COLOR_PALETTE_IMPLEMENTATION_GUIDE.md](./COLOR_PALETTE_IMPLEMENTATION_GUIDE.md)** - Complete guide with all methods and examples
