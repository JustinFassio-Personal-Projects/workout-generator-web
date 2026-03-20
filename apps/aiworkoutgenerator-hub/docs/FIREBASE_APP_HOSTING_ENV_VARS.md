# Firebase App Hosting Environment Variables

**Deployment context:** **`aiworkoutgenerator-hub`** (this Next.js app) is hosted on **[Firebase App Hosting](https://firebase.google.com/docs/app-hosting)** in project **`ai-workout-generator-hub`**. Production users reach it at the custom domain **`app.aiworkoutgenerator.com`** (see backend URL below for the default `*.hosted.app` URL). All hub env vars for production flow through **`apphosting.yaml`** → **Cloud Secret Manager** (`firebase apphosting:secrets:set`).

## Security Notice

**⚠️ IMPORTANT:** Firebase configuration values are stored in Cloud Secret Manager, NOT in this repository. While these are `NEXT_PUBLIC_*` variables (public values exposed in client-side code), we use Cloud Secret Manager for configuration management consistency and to keep the repository clean.

## Setup Instructions

### Step 1: Get Your Firebase Configuration Values

Get your Firebase configuration values from the [Firebase Console](https://console.firebase.google.com/):

1. Select your project
2. Go to **Project Settings** (gear icon)
3. Scroll to **Your apps** section
4. Click on your web app (or create one if needed)
5. Copy the configuration values

You'll need:

- `apiKey` (from `firebaseConfig.apiKey`)
- `authDomain` (from `firebaseConfig.authDomain`)
- `projectId` (from `firebaseConfig.projectId`)
- `storageBucket` (from `firebaseConfig.storageBucket`)
- `messagingSenderId` (from `firebaseConfig.messagingSenderId`)
- `appId` (from `firebaseConfig.appId`)
- `measurementId` (optional, from `firebaseConfig.measurementId`)

**Note:** These are `NEXT_PUBLIC_*` variables, meaning they're public values that will be exposed in client-side code. While not secret, we store them in Cloud Secret Manager for consistency and best practices.

### Step 2: Create Secrets in Cloud Secret Manager

Replace the placeholder values with your actual Firebase configuration:

```bash
# Set Firebase API Key
echo -n "<YOUR_FIREBASE_API_KEY>" | firebase apphosting:secrets:set firebase-api-key --data-file - --force

# Set Firebase Auth Domain (production hub: app.aiworkoutgenerator.com)
echo -n "<YOUR_FIREBASE_AUTH_DOMAIN>" | firebase apphosting:secrets:set firebase-auth-domain --data-file - --force

# Set Firebase Project ID
echo -n "<YOUR_FIREBASE_PROJECT_ID>" | firebase apphosting:secrets:set firebase-project-id --data-file - --force

# Set Firebase Storage Bucket
echo -n "<YOUR_FIREBASE_STORAGE_BUCKET>" | firebase apphosting:secrets:set firebase-storage-bucket --data-file - --force

# Set Firebase Messaging Sender ID
echo -n "<YOUR_FIREBASE_MESSAGING_SENDER_ID>" | firebase apphosting:secrets:set firebase-messaging-sender-id --data-file - --force

# Set Firebase App ID
echo -n "<YOUR_FIREBASE_APP_ID>" | firebase apphosting:secrets:set firebase-app-id --data-file - --force

# Set Firebase Measurement ID (optional)
echo -n "<YOUR_FIREBASE_MEASUREMENT_ID>" | firebase apphosting:secrets:set firebase-measurement-id --data-file - --force
```

The `--force` flag automatically:

- Creates the secret in Cloud Secret Manager
- Grants necessary permissions to the App Hosting service account
- Adds the secret reference to `apphosting.yaml`

### Step 3: Verify apphosting.yaml

After running the commands above, verify that `apphosting.yaml` references secrets (not hardcoded values):

```yaml
env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: firebase-api-key
  # ... etc
```

### Step 4: Deploy (Firebase App Hosting)

Once secrets are created and `apphosting.yaml` is configured:

1. Commit the `apphosting.yaml` file (it only contains secret references, not actual values)
2. Push to the branch your **App Hosting** backend is connected to (often `main`)
3. **Firebase App Hosting** builds and deploys automatically; secrets are injected at **build** and **runtime**
4. After changing OAuth-related secrets (especially **`firebase-auth-domain`**), wait for the rollout to finish, then hard-refresh or test in a private window on **`https://app.aiworkoutgenerator.com`**

You can also trigger or monitor rollouts in [Firebase Console](https://console.firebase.google.com) → your project → **App Hosting** → **aiworkoutgenerator-hub**.

## Backend Information

- **Backend Name:** aiworkoutgenerator-hub
- **Repository:** aiworkoutgen-aiworkoutgenerator-hub
- **URL:** https://aiworkoutgenerator-hub--ai-workout-generator-hub.asia-southeast1.hosted.app
- **Primary Region:** asia-southeast1

## Standard Environment Variables

**NODE_ENV**: Do NOT configure `NODE_ENV` in `apphosting.yaml`. Firebase App Hosting's adapter handles this correctly:

- Uses `development` during `npm ci` (installs all dependencies)
- Uses `production` during `next build` (enables optimizations)

Explicitly setting `NODE_ENV` in `apphosting.yaml` causes conflicts with Next.js build expectations.

## Node.js Version

The project is pinned to **Node.js 20 LTS** for compatibility with `firebase-admin` and Google Cloud libraries:

- Specified in `package.json` engines: `"node": "20.x"`
- Also in `.nvmrc`: `20`

## Firebase Configuration Values Reference

**Important:** These are `NEXT_PUBLIC_*` variables, which are public values exposed in client-side code. They're not secrets, but we use Cloud Secret Manager for configuration management consistency.

To find your values, go to [Firebase Console](https://console.firebase.google.com/) → Your Project → Project Settings → Your apps → Web app configuration.

The format of the values:

- `NEXT_PUBLIC_FIREBASE_API_KEY`: Starts with `AIza...` (public API key)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Production hub: **`app.aiworkoutgenerator.com`**. Local/emulator: override (e.g. `{project-id}.firebaseapp.com`). If unset, the app defaults `authDomain` to `app.aiworkoutgenerator.com`.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: `{project-id}.firebasestorage.app`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Numeric ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Format `1:{numeric-id}:web:{app-id}`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`: Format `G-{id}` (optional, for Analytics)

**On Firebase App Hosting (production):** Use the secrets already mapped in **`apphosting.yaml`** (`firebase-api-key`, **`firebase-auth-domain`**, etc.). Set the auth domain secret explicitly:

```bash
echo -n "app.aiworkoutgenerator.com" | firebase apphosting:secrets:set firebase-auth-domain --data-file - --force
```

Then push to your connected branch so **App Hosting** rebuilds. That sets **`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`** during the hosted build (see `apphosting.yaml`).

**Optional JSON (`FIREBASE_WEBAPP_CONFIG`):** Supported in code and **`next.config.ts`** for local builds or if you add a matching env entry to **`apphosting.yaml`**. It is **not** defined in `apphosting.yaml` today; production hub config uses **per-field** secrets. If you use JSON locally, prefer **`authDomain`: `app.aiworkoutgenerator.com`**. **`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`** (secret `firebase-auth-domain` on App Hosting) **always wins** over JSON `authDomain` when set — avoids stale `*.firebaseapp.com` in JSON and the cross-origin iframe error (`Blocked a frame … app.aiworkoutgenerator.com … firebaseapp.com`).

**Google OAuth (project `ai-workout-generator-hub`):** Firebase uses the auto-created **Web application** OAuth client in Google Cloud (not a random new client).

| Field | Value |
|--------|--------|
| **Console name** | Web client (auto created by Google Service) |
| **Type** | Web application |
| **Client ID** | `363110423518-e4v4g1sse7ki8fek7ja7smanfk7rilqc.apps.googleusercontent.com` |

1. [Google Cloud Console](https://console.cloud.google.com) → project **ai-workout-generator-hub** → **APIs & services** → **Credentials** → open that **OAuth 2.0 Client ID** → **Authorized JavaScript origins** → include **`https://app.aiworkoutgenerator.com`** → **Authorized redirect URIs** → add **`https://app.aiworkoutgenerator.com/__/auth/handler`** (keep existing `*.firebaseapp.com` entries if Firebase added them).
2. [Firebase Console](https://console.firebase.google.com) → **Authentication** → **Settings** → **Authorized domains** → include **`app.aiworkoutgenerator.com`**.
3. Redeploy **App Hosting** after env/auth changes as above.

OAuth web **client IDs** are public in the browser; do not commit **client secrets** (this client type typically has no secret for SPAs).

**Verify `authDomain` without sharing secrets:** Local dev: console shows `[Firebase] authDomain in use: …`. Production: confirm secret **`firebase-auth-domain`** is `app.aiworkoutgenerator.com`, wait for App Hosting rollout, then confirm Google sign-in uses **`https://app.aiworkoutgenerator.com/__/auth/handler`**. **`monitoring` 403** is usually Sentry tunnel/ad-blockers, not Firebase Auth.

**Do not paste** `FIREBASE_WEBAPP_CONFIG` or service account JSON into chat; redact `apiKey` if you need help reviewing shape.

## Important Notes

- ✅ **apphosting.yaml** contains only secret references (safe to commit)
- ✅ Configuration values are stored in Cloud Secret Manager (even though they're public)
- ✅ Values are automatically available at BUILD and RUNTIME
- ✅ Values can be updated without code changes
- ℹ️ **Note:** These `NEXT_PUBLIC_*` variables are public values that appear in client-side code. They're protected by Firebase Security Rules, not by secrecy. We use Cloud Secret Manager for configuration management consistency.

## Rotating Secrets

To update a secret value:

```bash
echo -n "NEW_VALUE" | firebase apphosting:secrets:set <secret-name> --data-file - --force
```

After updating, redeploy your app for changes to take effect.

## Grant access to all App Hosting secrets

After creating secrets (or if the build fails with "Error resolving secret version" / "Permission denied"), the App Hosting backend must be granted access to each secret. Run once to grant access to every secret referenced in `apphosting.yaml`:

```bash
./scripts/grant-apphosting-secrets-access.sh
```

Or with the CLI directly (secret names must be one comma-separated argument):

```bash
firebase apphosting:secrets:grantaccess --backend aiworkoutgenerator-hub \
  "firebase-api-key,firebase-auth-domain,firebase-project-id,firebase-storage-bucket,firebase-messaging-sender-id,firebase-app-id,firebase-measurement-id,posthog-key,posthog-host,google-ai-api-key,stripe-secret-key,stripe-publishable-key,stripe-basic-price-id,stripe-pro-price-id,stripe-elite-price-id,stripe-coach-price-id,stripe-coach-pro-price-id,stripe-webhook-secret,firebase-cloud-function-url,firebase-service-account-key,sentry-dsn,sentry-auth-token,sentry-org,sentry-project,sentry-url"
```

Replace `aiworkoutgenerator-hub` with your backend ID if different (`firebase apphosting:backends:list`). If you add a new secret to `apphosting.yaml`, add its name to the list in `scripts/grant-apphosting-secrets-access.sh` and run again, then redeploy.

## Additional Environment Variables

For other environment variables (Stripe, Google AI, etc.), follow the same pattern:

1. Create secrets using `firebase apphosting:secrets:set`
2. Reference them in `apphosting.yaml`
3. Commit only the secret references
