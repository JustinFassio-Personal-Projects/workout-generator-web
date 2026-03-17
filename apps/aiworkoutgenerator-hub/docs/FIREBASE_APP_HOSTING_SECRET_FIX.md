# Firebase App Hosting Secret Permissions Fix

## Issue

Build (or runtime) fails with either:

- `Permission 'secretmanager.versions.get' denied for resource '.../secrets/<name>/versions/latest'`, or
- `Error resolving secret version with name=.../secrets/<name>/versions/latest`

Same underlying cause each time (e.g. first time with Firebase config secrets, later with `sentry-url`, or any other new secret).

## Root Cause

The App Hosting backend only has access to secrets you explicitly grant. When you add a **new** secret to `apphosting.yaml` and create it with `firebase apphosting:secrets:set`, the secret exists in Secret Manager but the **backend is not automatically granted access**. You must run `firebase apphosting:secrets:grantaccess` and include every secret the backend needs. Forgetting this step (or omitting a new secret from the list) causes the error.

Using `gcloud secrets add-iam-policy-binding` alone is not sufficient; App Hosting expects permissions to be granted via the Firebase CLI: `firebase apphosting:secrets:grantaccess`.

## Solution

Grant the backend access to **all** secrets referenced in `apphosting.yaml`. Secret names must be one comma-separated argument. Easiest: run `./scripts/grant-apphosting-secrets-access.sh`. Or run:

```bash
firebase apphosting:secrets:grantaccess --backend aiworkoutgenerator-hub \
  "firebase-api-key,firebase-auth-domain,firebase-project-id,firebase-storage-bucket,firebase-messaging-sender-id,firebase-app-id,firebase-measurement-id,posthog-key,posthog-host,google-ai-api-key,stripe-secret-key,stripe-publishable-key,stripe-basic-price-id,stripe-pro-price-id,stripe-elite-price-id,stripe-coach-price-id,stripe-coach-pro-price-id,stripe-webhook-secret,firebase-cloud-function-url,firebase-service-account-key,sentry-dsn,sentry-auth-token,sentry-org,sentry-project,sentry-url"
```

Replace `aiworkoutgenerator-hub` with your backend ID if different (`firebase apphosting:backends:list`). When you add a new secret to `apphosting.yaml`, add its name to this list and run the command again.

## Verification

The App Hosting service account (`service-363110423518@gcp-sa-firebaseapphosting.iam.gserviceaccount.com`) should have `roles/secretmanager.secretAccessor` on each secret in the list.

## Notes

- IAM permission changes can take 1-5 minutes to propagate.
- Use `firebase apphosting:secrets:grantaccess` (not only gcloud) for App Hosting.
- After granting, wait 2-3 minutes before triggering a new build.
- **Recurring:** Every time you add a new secret to `apphosting.yaml`, run grantaccess again with the full list (including the new name). See [FIREBASE_APP_HOSTING_SECRET_RESOLVE_ERROR.md](FIREBASE_APP_HOSTING_SECRET_RESOLVE_ERROR.md).
