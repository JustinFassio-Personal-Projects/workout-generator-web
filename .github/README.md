# GitHub Actions (monorepo)

Workflows must live under **`.github/workflows/` at the repository root**. Nested paths such as `apps/*/\.github/workflows/` are **not** executed by GitHub.

## Hub (`aiworkoutgenerator-hub`)

| Workflow | Purpose |
|----------|---------|
| `ci-hub.yml` | Lint, format, type-check, tests, build for `apps/aiworkoutgenerator-hub` |
| `deploy-hub-firestore.yml` | Deploy Firestore rules/indexes + Storage rules via Firebase CLI + Workload Identity |

**Auth:** OIDC to `github-deployer@ai-workout-generator-hub.iam.gserviceaccount.com`. If you renamed or forked the GitHub repo, update the **Workload Identity provider** attribute conditions in Google Cloud so the monorepo is allowed.

**If CI fails with WIF "unauthorized_client" / "credential is rejected by the attribute condition":**  
1) Provider: add attribute condition `assertion.repository == 'JustinFassio-Personal-Projects/workout-generator-web'`.  
2) Service Account: grant `roles/iam.workloadIdentityUser` to `principalSet://iam.googleapis.com/projects/363110423518/locations/global/workloadIdentityPools/github-actions/attribute.repository/JustinFassio-Personal-Projects/workout-generator-web`. See [WORKLOAD_IDENTITY_FEDERATION.md](../apps/aiworkoutgenerator-hub/docs/WORKLOAD_IDENTITY_FEDERATION.md#troubleshooting).

**WIF config:** Reference copy of the Workload Identity Federation pool config is at `apps/aiworkoutgenerator-hub/docs/WORKLOAD_IDENTITY_FEDERATION_CONFIG.json`. GitHub Actions uses `google-github-actions/auth` and does not need this file at runtime; it is kept for setup reference and debugging.

See also: `apps/aiworkoutgenerator-hub/docs/DEPLOY_COMMANDS.md`.
