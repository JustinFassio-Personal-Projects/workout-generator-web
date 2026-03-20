# Checklist: Standalone `aiworkoutgenerator-hub` repo → Monorepo

Use this when the canonical app lives at **`apps/aiworkoutgenerator-hub`** in **`workout-generator-web`** instead of a separate repository.

**Monorepo app root:** `apps/aiworkoutgenerator-hub/`  
**Firebase project (current `.firebaserc`):** `ai-workout-generator-hub`  
**Production hub URL (custom domain):** `https://app.aiworkoutgenerator.com`  
**Related docs:** [FIREBASE_APP_HOSTING_ENV_VARS.md](./FIREBASE_APP_HOSTING_ENV_VARS.md)

> **Other apps:** If you are migrating **programs** (or another subdomain) to Vercel from the monorepo, repeat the **Vercel / env / domain** sections for that app’s Vercel project and hostname (e.g. `programs.aiworkoutgenerator.com`). The hub’s primary production path here is **Firebase App Hosting**, not Vercel production.

---

## 1. Re-link the Firebase project (CLI)

- [ ] `cd` to the app folder:  
  `cd apps/aiworkoutgenerator-hub`
- [ ] Run `firebase use --add` and select the existing production project (`ai-workout-generator-hub` or your real project ID).
- [ ] Set an alias (commonly `default` or `production`).
- [ ] Confirm **`.firebaserc`** in this folder lists the correct project ID(s).
- [ ] From the same directory, run a harmless check: `firebase projects:list` or `firebase use` and verify the active project.

---

## 2. Move / verify Firebase config files

> **SWOT analysis:** See [FIREBASE_CONFIG_SWOT.md](./FIREBASE_CONFIG_SWOT.md) for detailed findings.

- [x] **`firebase.json`** lives under `apps/aiworkoutgenerator-hub/` (not only at monorepo root unless you intentionally centralize).
- [x] **`firestore.rules`**, **`firestore.indexes.json`**, **`storage.rules`** — present and referenced; **`database.rules.json`** — not used.
- [ ] Open **`firebase.json`** and verify:
  - [x] **`hosting`** — removed; App Hosting only (see [DEPLOY_COMMANDS.md](./DEPLOY_COMMANDS.md)).
  - [x] **`functions.source`** (e.g. `functions`) points to the real `functions/` folder under this app.
  - [x] **Firestore** `rules` / `indexes` paths resolve from this app directory.
- [x] **`apphosting.yaml`** is present and secret references match what you use in Firebase Console / Secret Manager for **App Hosting** builds.

---

## 3. Environment variables (App Hosting, Vercel previews, local)

### Firebase App Hosting (production hub)

- [x] **Secrets / env** for the backend are set per **`apphosting.yaml`** — all 28 secrets exist in Cloud Secret Manager (`gcloud secrets list --project=ai-workout-generator-hub`). See [FIREBASE_APP_HOSTING_ENV_VARS.md](./FIREBASE_APP_HOSTING_ENV_VARS.md).
- [ ] **`NEXT_PUBLIC_*`** Firebase web config values match the same Firebase **project** as before (GA4 / Analytics continuity if the app ID is unchanged) — *manual check: verify in Firebase Console → Project Settings → Your apps*.
- [ ] **`firebase-auth-domain`** secret value is **`app.aiworkoutgenerator.com`** — *verify: `gcloud secrets versions access latest --secret=firebase-auth-domain --project=ai-workout-generator-hub`*.

### Vercel (if this app or monorepo has a Vercel project)

- [x] **N/A for hub** — `aiworkoutgenerator-hub` has no `vercel.json`; production is **Firebase App Hosting** only. Skip Vercel env/root for the hub. *If you add a Vercel preview project for the hub later:* copy `NEXT_PUBLIC_FIREBASE_*` and Admin SDK creds; set root to `apps/aiworkoutgenerator-hub`.

---

## 4. CI/CD and service account

- [x] **Service account for Firestore deploy** — Uses **Workload Identity** (`github-deployer@ai-workout-generator-hub.iam.gserviceaccount.com`), not `FIREBASE_SERVICE_ACCOUNT` JSON key. No new key needed.
- [x] **`FIREBASE_SERVICE_ACCOUNT`** — N/A for current setup. Root workflows use Workload Identity. The commented deploy-preview in `apps/aiworkoutgenerator-hub/.github/workflows/ci.yml` would need it if re-enabled.
- [x] **Workflow file location** — Root workflows: `.github/workflows/deploy-hub-firestore.yml`, `.github/workflows/ci-hub.yml`. Nested hub workflows are deprecated (see comments in those files).
- [x] **Working directory** — `npm ci` at monorepo root; `firebase deploy` steps use `working-directory: apps/aiworkoutgenerator-hub`. CI uses job `defaults` + root `npm ci` override.
- [x] **Path updates** — Firebase CLI runs from hub directory so `firebase.json` resolves correctly.

---

## 5. Cutover: domains and traffic

- [ ] **App Hosting rootDirectory (monorepo):** In Firebase Console → **App Hosting** → **aiworkoutgenerator-hub** → **Settings** → Codebase / Git connection, set **Root directory** to `apps/aiworkoutgenerator-hub`. If it is `/` (repo root), the build will fail when the backend is connected to the monorepo. Reconnect the backend to the **workout-generator-web** repo and set root to `apps/aiworkoutgenerator-hub`.
- [ ] **Hub (Firebase App Hosting):** After deploy, confirm **`https://app.aiworkoutgenerator.com`** (and OAuth redirect / authorized domains) still match [FIREBASE_APP_HOSTING_ENV_VARS.md](./FIREBASE_APP_HOSTING_ENV_VARS.md) guidance.
- [ ] **DNS / SSL:** Custom domain and **CAA** records remain valid for wherever production is served (App Hosting vs Vercel).
- [ ] **Optional Vercel subdomain:** If production for this product is on Vercel instead, map the production domain to the **new** Vercel project and verify build output.

### Analytics

- [ ] Same **Firebase project ID** and same **web app** config → **Google Analytics for Firebase** can continue without a “repo” break; verify events in DebugView / realtime after cutover.

---

## 6. Firebase Functions — deploy safety

- [ ] Before the first `firebase deploy --only functions` from the monorepo path, ensure **`functions/`** (or your configured source) includes **all** function code you still need in production.
- [ ] If the CLI warns that functions exist **in the project** but **not in local source**:
  - [ ] **Do not** confirm deletion of functions you still rely on.
  - [ ] Merge or port missing functions, then deploy again.

---

## 7. Post-migration smoke tests

- [ ] Local: from the monorepo root run `npm ci` (or `npm install` for local development), then build/run the hub from `apps/aiworkoutgenerator-hub`.
- [ ] Sign-in (e.g. Google) on production URL; confirm **auth handler** / **authorized domains** / **OAuth client** origins.
- [ ] Firestore reads/writes for a test user (rules still apply).
- [ ] App Hosting rollout finished after secret changes (hard refresh / private window).

---

## Quick reference — paths in this monorepo

| Item | Typical location |
|------|------------------|
| App root | `apps/aiworkoutgenerator-hub/` |
| Firebase CLI project file | `apps/aiworkoutgenerator-hub/.firebaserc` |
| Firebase config | `apps/aiworkoutgenerator-hub/firebase.json` |
| App Hosting | `apps/aiworkoutgenerator-hub/apphosting.yaml` |
| Env examples | `apps/aiworkoutgenerator-hub/.env.example` |
| Hub CI/CD (active) | `.github/workflows/ci-hub.yml`, `.github/workflows/deploy-hub-firestore.yml` |
| Hub workflows (deprecated) | `apps/aiworkoutgenerator-hub/.github/workflows/*.yml` |
| Firebase config SWOT | `apps/aiworkoutgenerator-hub/docs/FIREBASE_CONFIG_SWOT.md` |
| Deploy commands | `apps/aiworkoutgenerator-hub/docs/DEPLOY_COMMANDS.md` |

---

*Last updated: migration checklist for standalone → monorepo hub. Section 2 verified via [FIREBASE_CONFIG_SWOT.md](./FIREBASE_CONFIG_SWOT.md).*
