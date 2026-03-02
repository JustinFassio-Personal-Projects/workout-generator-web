# Commands: Build and run apps in the monorepo

From the **repository root** unless otherwise noted. Requires Node.js 18+ and npm.

**Important:** `npm run dev:main`, `npm run dev:admin`, and `npm run dev:programs` exist only on the **root** `package.json`. Run them from the repo root, not from `astro-site` or inside an app.

---

## Opening the root and app directories

**In the terminal:** navigate to the repo root (the directory that contains `apps/`, `astro-site/`, and the root `package.json`). From there, use relative paths to open a specific app directory:

```bash
cd apps/admin-dash
cd apps/main-web
cd apps/programs
cd astro-site
```

**In VS Code / Cursor:** use **File → Open Folder** and choose the repo root (`Workout Generator`). To work in a single app, open the repo root first, then use the file tree to open `apps/admin-dash`, `apps/main-web`, `apps/programs`, or `astro-site`. For terminal commands that use the root `package.json` (e.g. `npm run dev:main`), open a terminal with the workspace root as the current directory.

---

## One-time setup

```bash
npm install
```

Installs dependencies for all workspaces (`apps/*`, `packages/*`).

---

## Build

| Command | Description |
|--------|-------------|
| `npm run build` | Build all apps and packages (Turborepo, concurrency 1). |
| `npm run build --workspace=admin-dash` | Build only admin-dash. |
| `npm run build --workspace=main-web` | Build only main-web. |
| `npm run build --workspace=programs` | Build only programs (Astro). |

To build a single app from inside its directory:

```bash
cd apps/admin-dash && npm run build
cd apps/main-web  && npm run build
cd apps/programs  && npm run build
```

The shared UI package is built automatically when you build an app that depends on it.

---

## Run (development)

**From the repository root:**

| Command | Description |
|--------|-------------|
| `npm run dev` | Start **all** dev servers (admin-dash + main-web + any other workspace with a `dev` script). |
| `npm run dev:admin` | Start only **admin-dash** (Next.js on port **3008**). |
| `npm run dev:main` | Start only **main-web** (Next.js on port **3007**). |
| `npm run dev:programs` | Start only **programs** (Astro on port **3006**). |

Or from the app directory:

```bash
cd apps/admin-dash && npm run dev   # → http://localhost:3008
cd apps/main-web  && npm run dev   # → http://localhost:3007
cd apps/programs  && npm run dev   # → http://localhost:3006
```

---

## Run (production)

After building, start a single app in production mode:

```bash
cd apps/admin-dash && npm run start   # port 3008
cd apps/main-web  && npm run start   # port 3007
cd apps/programs  && npm run start   # port 3006 dev; 3002/8080 for server.js
```

---

## Astro sites

- **`apps/programs`** is the in-repo Astro app (part of workspaces). From root: `npm run dev:programs`. From app dir: `cd apps/programs && npm run dev` (port **3006**).
- **`astro-site`** at the repo root is not part of the npm workspaces. To run it:

```bash
cd astro-site
npm install
npm run dev     # development
npm run build   # production build
npm run preview # preview production build
```

---

## Quick reference

| App | Port | From root | From app dir |
|-----|------|-----------|---------------|
| **admin-dash** | 3008 | `npm run dev:admin` | `cd apps/admin-dash && npm run dev` |
| **main-web** | 3007 | `npm run dev:main` | `cd apps/main-web && npm run dev` |
| **programs** | 3006 | `npm run dev:programs` | `cd apps/programs && npm run dev` |
