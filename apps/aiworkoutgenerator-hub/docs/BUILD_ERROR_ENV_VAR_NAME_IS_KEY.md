# Build error: "failed to write env var KEY-----" (private key as env name)

## The error

Firebase App Hosting build fails in step **preparer** with:

```
writing final dereferenced environment variables to /platform/env: failed to write env var KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj...
...
open /platform/env/KEY-----...: no such file or directory
```

The platform is trying to use a **private key (PEM)** as the **environment variable name**. File paths have length/special-character limits, so creating a file named with the key content fails.

---

## Cause

The platform is using a **private key (PEM)** as an **environment variable name**. That can come from:

1. **Backend override env (most common)** — The backend has **Environment variables** set in the **Firebase Console** (App Hosting → backend → Settings → Environment). Console values override `apphosting.yaml`. If the service account JSON was pasted or imported incorrectly, the **variable name** may have been set to the key content (e.g. `KEY-----\nMIIEvQ...`) and the rest as value. That produces the invalid path.
2. **Secret Manager** — A secret whose **secret name (ID)** is the key content instead of a short name like `firebase-service-account-key`.

---

## Fix: check backend override env first

### 1. See which backend has the bad env var

```bash
firebase apphosting:backends:list --project ai-workout-generator-hub -j
```

In the JSON, find the backend that is failing (e.g. **workout-generator-web** for the monorepo). Look at `overrideEnv`. If you see an entry whose `"variable"` is a long string starting with `KEY-----`, the cause is **Console-set env**, not Secret Manager.

### 2. Remove the bad variable in Firebase Console

1. [Firebase Console](https://console.firebase.google.com/) → project **ai-workout-generator-hub** → **App Hosting**.
2. Open the backend that is failing (e.g. **workout-generator-web**).
3. Go to **Settings** → **Environment** (or **Environment variables**).
4. Find the variable whose **name** is the long private key (starts with `KEY-----`). **Delete** it.
5. Optionally: remove or fix **GOOGLE_APPLICATION_CREDENTIALS_JSON** if it’s truncated or wrong. This app should use **FIREBASE_SERVICE_ACCOUNT_KEY** from `apphosting.yaml` (secret `firebase-service-account-key`) instead of a Console literal.
6. Save. Trigger a new rollout (Rollouts → Roll out, or push to the connected branch).

After removing the bad entry, the build should proceed. No change to Secret Manager is needed if all secret **names** in `gcloud secrets list` are short and normal.

---

## Fix: if the cause is Secret Manager (secret name = key content)

### 1. List secrets and find the bad one

```bash
gcloud secrets list --project=ai-workout-generator-hub --format="table(name.basename(),createTime)"
```

Look for a secret whose **name** (first column) is a long base64/PEM string or starts with `KEY-----`. If you don’t see one, the cause is backend override env (see above).

### 2. Fix the service-account key secret

The correct setup is:

- **Secret name (ID):** `firebase-service-account-key` (short, no spaces/newlines).
- **Secret value:** Full JSON content of the Firebase service account key file (the entire file you download from Firebase Console → Project settings → Service accounts).

**Option A — Re-set via Firebase CLI (recommended):**

```bash
cd apps/aiworkoutgenerator-hub
# Paste or pipe the full JSON key; the flag sets the *value*, not the name
firebase apphosting:secrets:set firebase-service-account-key --data-file /path/to/your-service-account-key.json --force
```

**Option B — Fix in Google Cloud Console:**

1. [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=ai-workout-generator-hub)
2. If a secret exists whose **name** is the key content: delete it (or leave it and create a correctly named one).
3. Create a secret with **name** exactly: `firebase-service-account-key`.
4. Put the **full JSON key file content** as the secret value (e.g. paste into "Secret value").

### 3. Grant backend access and redeploy

After the secret has the correct **name** and **value**:

```bash
./scripts/grant-apphosting-secrets-access.sh
```

Wait 2–3 minutes, then trigger a new rollout (push to the connected branch or redeploy from Firebase Console → App Hosting → Rollouts).

---

## Reference

- Env mappings: `apphosting.yaml` (variable `FIREBASE_SERVICE_ACCOUNT_KEY` → secret `firebase-service-account-key`).
- Other secret issues: [FIREBASE_APP_HOSTING_SECRET_RESOLVE_ERROR.md](./FIREBASE_APP_HOSTING_SECRET_RESOLVE_ERROR.md).
