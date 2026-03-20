# Workload Identity Federation (GitHub Actions)

Reference for the Workload Identity pool used by GitHub Actions to deploy Firestore and Storage rules.

## Config

- **File:** [WORKLOAD_IDENTITY_FEDERATION_CONFIG.json](./WORKLOAD_IDENTITY_FEDERATION_CONFIG.json)
- **Pool:** `github-actions` in project `363110423518` (ai-workout-generator-hub)
- **Service account:** `github-deployer@ai-workout-generator-hub.iam.gserviceaccount.com`

## Usage

- **GitHub Actions:** Uses `google-github-actions/auth` with `workload_identity_provider` and `service_account`. The workflows do *not* use this JSON file; they exchange the GitHub OIDC token directly.
- **Local / debugging:** This config is kept for reference when setting up or updating the pool in Google Cloud, or when troubleshooting auth errors.

## Notes

- The `credential_source.file` value (`assertion.sub`) in the config is the pool/provider attribute mapping. GitHub Actions receives the OIDC token from `ACTIONS_ID_TOKEN_REQUEST_URL`; this JSON describes how Google validates and maps it.
- If you rename or fork the GitHub repo, update the **Workload Identity provider** attribute conditions in Google Cloud to allow the new org/repo.
