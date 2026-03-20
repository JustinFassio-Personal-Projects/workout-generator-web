# Firebase Deploy Commands

Use explicit `--only` to deploy specific services. Avoid bare `firebase deploy` to prevent unintended deploys.

## Quick reference

| Service | Command | When to run |
|---------|---------|-------------|
| Firestore rules + indexes | `firebase deploy --only firestore` | After changing `firestore.rules` or `firestore.indexes.json` |
| Storage rules | `firebase deploy --only storage` | After changing `storage.rules` |
| Functions | `firebase deploy --only functions` | After changing code in `functions/` |
| All rules + functions | `firebase deploy --only firestore,storage,functions` | Before cutover or after major config changes |

**Run from:** `apps/aiworkoutgenerator-hub` (or `cd apps/aiworkoutgenerator-hub` from monorepo root).

## GitHub Actions (monorepo root)

| Workflow | File | Trigger |
|----------|------|---------|
| Hub CI | `.github/workflows/ci-hub.yml` | PR/push affecting `apps/aiworkoutgenerator-hub/**` |
| Firestore + Storage rules | `.github/workflows/deploy-hub-firestore.yml` | Push to `main` when hub rules / `firebase.json` change, or **workflow_dispatch** |

Uses **Workload Identity** (`github-deployer@ai-workout-generator-hub`). If workflows fail with auth errors after moving repos, update the **Workload Identity pool** in Google Cloud to trust the monorepo’s GitHub org/repo.

Pool config reference: [WORKLOAD_IDENTITY_FEDERATION_CONFIG.json](./WORKLOAD_IDENTITY_FEDERATION_CONFIG.json).

## App Hosting (production app runtime)

**App Hosting** is deployed automatically when you push to the connected branch (usually `main`). It does **not** use `firebase deploy`. See [FIREBASE_APP_HOSTING_ENV_VARS.md](./FIREBASE_APP_HOSTING_ENV_VARS.md).

## Notes

- **No classic Hosting:** `firebase.json` has no hosting block. App Hosting serves production.
- **Rules deploy reminder:** Local changes to Firestore or Storage rules are **not** auto-deployed. Run `firebase deploy --only firestore` or `--only storage` after edits.
- **Package scripts:** Use `pnpm firebase:deploy-firestore` or `pnpm firebase:deploy-storage` for convenience.
