# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## API routes

- **`/api/leads`** (POST): Lead capture. Endpoint is ready; no lead form UI in Footer or exercise-challenge today. A future footer or landing form can POST here.
- **`/api/blog`** (GET): Blog listing for homepage BlogPreview.
- **`/api/reports/gemini-workout`** (POST): AI workout generation for the reports live demo.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Security / npm audit

`@astrojs/vercel` is pinned to **8.0.4** to avoid the high-severity path-to-regexp advisory (GHSA-9wv6-86v2-598j) that affects newer 8.x and 9.x releases. Running `npm audit` (or `npm audit --audit-level=moderate`) may report **2 moderate** (esbuild, GHSA-67mh-4wv8-2f99); that advisory affects the **development server** only (CORS on localhost), not production builds or deployed output. **These 2 moderate are accepted for pre-push.** Do not run `npm audit fix --force` here—it would upgrade to a version that reintroduces the high-severity path-to-regexp issue. **TODO:** Periodically check newer `@astrojs/vercel` 8.x/9.x releases and the status of GHSA-9wv6-86v2-598j; once a fixed version is available, update this dependency and remove or relax the pin.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
