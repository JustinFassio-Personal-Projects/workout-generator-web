# Fix: Sentry Source Map Upload ("Project not found" / "One or more projects are invalid")

If `npm run build` succeeds but you see Sentry errors like **"Project not found"** or **"One or more projects are invalid (http status: 400)"**, the build-time Sentry config is wrong. Follow these steps.

## 1. Use the correct project slug (not the org slug)

The **organization slug** and **project slug** are different.

- **SENTRY_ORG** = your Sentry organization slug (e.g. `ai-workout-generator`).
- **SENTRY_PROJECT** = the **project** slug under that org (e.g. `javascript-nextjs`), **not** the org name.

**Common mistake:** Setting `SENTRY_PROJECT=ai-workout-generator` (org name). That is invalid; Sentry expects a **project** slug.

**For this repo (Sentry MCP / dashboard):**

- Org: **ai-workout-generator**
- Project: **javascript-nextjs**

So you must have:

```bash
SENTRY_ORG=ai-workout-generator
SENTRY_PROJECT=javascript-nextjs
```

## 2. Set SENTRY_URL for US region

If your Sentry org is on the **US** region (e.g. https://ai-workout-generator.sentry.io), the CLI must talk to `us.sentry.io`. Set:

```bash
SENTRY_URL=https://us.sentry.io
```

Without this, the CLI may hit the default (EU) endpoint and your project won’t be found.

## 3. Where to set these for local builds

The Next.js Sentry plugin reads `process.env` during `next build`. So you can set the variables in either place (or both):

**Option A – `.env.local` (recommended for local dev)**

Add or fix in `.env.local`:

```bash
SENTRY_ORG=ai-workout-generator
SENTRY_PROJECT=javascript-nextjs
SENTRY_URL=https://us.sentry.io
SENTRY_AUTH_TOKEN=sntrys_...   # From Sentry > Settings > Auth Tokens (scopes: project:read, project:write, org:read)
```

**Option B – `.env.sentry-build-plugin` (build-only, gitignored)**

Copy `.env.sentry-build-plugin.example` to `.env.sentry-build-plugin` and set:

```bash
SENTRY_AUTH_TOKEN=your_token
SENTRY_ORG=ai-workout-generator
SENTRY_PROJECT=javascript-nextjs
SENTRY_URL=https://us.sentry.io
```

Then run:

```bash
npm run build
```

Source map upload should succeed.

## 4. CI / App Hosting

- **GitHub Actions:** Set secrets `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, and **`SENTRY_URL`** (e.g. `https://us.sentry.io`) in the repo secrets and pass them into the build step (see `.github/workflows/ci.yml`).
- **Firebase App Hosting:** Sentry env vars are in `apphosting.yaml` (sentry-dsn, sentry-auth-token, sentry-org, sentry-project, **sentry-url**). Set the `sentry-url` secret to `https://us.sentry.io` (`firebase apphosting:secrets:set sentry-url`), then run `firebase apphosting:secrets:grantaccess` including `sentry-url` (see docs/FIREBASE_APP_HOSTING_ENV_VARS.md).

## 5. "Invalid token" (401) when uploading source maps

If the build reports **"Invalid token (http status: 401)"**:

1. **US region:** Your org is on **US** (`https://us.sentry.io`). The Sentry CLI must use the same base URL. Ensure **SENTRY_URL=https://us.sentry.io** is set where the build runs:
   - **Local:** In `.env.local` or `.env.sentry-build-plugin`.
   - **Firebase App Hosting:** Set secret `sentry-url` to `https://us.sentry.io` (`firebase apphosting:secrets:set sentry-url`), add it to `apphosting.yaml` (done), and run `firebase apphosting:secrets:grantaccess ... sentry-url ...`.
2. **Token validity:** In Sentry go to **Settings → Auth Tokens**. Confirm the token is not revoked or expired. Create a new token with scopes **org:read**, **project:read**, **project:write** and update `.env.local` / Firebase secret `sentry-auth-token`.
3. **Config:** This repo’s `next.config.ts` passes `authToken` and `sentryUrl` from `process.env` (with `sentryUrl` defaulting to `https://us.sentry.io`). So `SENTRY_AUTH_TOKEN` and optionally `SENTRY_URL` in `.env.local` are used for local builds; for App Hosting, the same variables are provided via secrets.

## 6. Verify org and project slugs

- In Sentry: **Settings → Organization → General** for org slug; **Project Settings → General** for project slug.
- Or use Sentry MCP: `find_organizations` and `find_projects` (with `organizationSlug`) to get exact slugs.

---

**Summary:** Set `SENTRY_PROJECT=javascript-nextjs` (not the org name) and `SENTRY_URL=https://us.sentry.io` for US. For 401 errors, ensure the auth token is valid and has scopes org:read, project:read, project:write, and that `SENTRY_URL` is set for US org. Then rebuild.
