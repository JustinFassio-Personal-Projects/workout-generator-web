# "Error resolving secret version" — Troubleshooting

## The error

Build or runtime fails with:

```
Error resolving secret version with name=projects/ai-workout-generator-hub/secrets/<SECRET_NAME>/versions/latest.
Please ensure the secret exists in your project and that your App Hosting backend has access to it.
```

Examples: `sentry-url`, or any other secret you recently added to `apphosting.yaml` (e.g. a previous occurrence with another secret).

---

## Why this happens (same issue every time)

Two things must be true for App Hosting to use a secret:

1. **The secret exists** in Google Cloud Secret Manager (e.g. you ran `firebase apphosting:secrets:set <name>`).
2. **The App Hosting backend has IAM access** to that secret.

When you **add a new secret** to `apphosting.yaml` and create it with `firebase apphosting:secrets:set`, the secret is created, but the App Hosting backend is **not** automatically granted access. You must run **`firebase apphosting:secrets:grantaccess`** and include every secret name your backend needs. If you add a new secret and forget to run `grantaccess` (or don’t add the new name to the list), you get this error.

So this is the **same underlying issue** each time: a new (or previously un-granted) secret is referenced in `apphosting.yaml` but the backend hasn’t been given access to it.

---

## Fix (two steps)

### 1. Ensure the secret exists

If you’re not sure the secret was ever set:

```bash
# Example for sentry-url (value for US region)
echo -n "https://us.sentry.io" | firebase apphosting:secrets:set sentry-url --data-file - --force
```

Use the correct value for your setup. For other secrets, see `docs/FIREBASE_APP_HOSTING_ENV_VARS.md`.

### 2. Grant the backend access to all secrets

You must grant the App Hosting backend access to **every** secret referenced in `apphosting.yaml`. The secret names must be passed as a **single** comma-separated argument.

**Option A — run the script (easiest):**

```bash
./scripts/grant-apphosting-secrets-access.sh
```

Pass a different backend ID if needed: `./scripts/grant-apphosting-secrets-access.sh your-backend-id`

**Option B — run the CLI directly:**

```bash
firebase apphosting:secrets:grantaccess --backend aiworkoutgenerator-hub \
  "firebase-api-key,firebase-auth-domain,firebase-project-id,firebase-storage-bucket,firebase-messaging-sender-id,firebase-app-id,firebase-measurement-id,posthog-key,posthog-host,google-ai-api-key,stripe-secret-key,stripe-publishable-key,stripe-basic-price-id,stripe-pro-price-id,stripe-elite-price-id,stripe-coach-price-id,stripe-coach-pro-price-id,stripe-webhook-secret,firebase-cloud-function-url,firebase-service-account-key,sentry-dsn,sentry-auth-token,sentry-org,sentry-project,sentry-url"
```

- Backend ID: use your backend ID if different (check with `firebase apphosting:backends:list`).
- **Whenever you add a new secret to `apphosting.yaml`**, add its name to the comma-separated list in `scripts/grant-apphosting-secrets-access.sh` (and in this doc) and run again, then redeploy.

---

## After running grantaccess

- IAM changes can take 1–5 minutes to propagate.
- Wait 2–3 minutes, then trigger a new build (push a commit or redeploy from Firebase Console → App Hosting).

---

## Reference

- Full env/secrets setup: [FIREBASE_APP_HOSTING_ENV_VARS.md](FIREBASE_APP_HOSTING_ENV_VARS.md)
- First-time permission fix (same idea): [FIREBASE_APP_HOSTING_SECRET_FIX.md](FIREBASE_APP_HOSTING_SECRET_FIX.md)
- Firebase: [Configure secret parameters](https://firebase.google.com/docs/app-hosting/configure#secret-parameters)
