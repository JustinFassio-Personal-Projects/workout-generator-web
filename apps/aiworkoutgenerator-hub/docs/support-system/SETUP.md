# Support System Production Setup

## Overview

This guide documents the production setup for the Help & Feedback Center support ticket system. The system uses Firebase App Hosting with Cloud Secret Manager for secure environment variable management.

## ✅ Working Solution

The support system is configured using **Firebase App Hosting** with **Cloud Secret Manager** for environment variables.

### Production Configuration

- **Deployment Platform:** Firebase App Hosting
- **Backend:** `aiworkoutgenerator-hub`
- **Region:** `asia-southeast1`
- **URL:** `https://aiworkoutgenerator-hub--ai-workout-generator-hub.asia-southeast1.hosted.app`

### Cloud Function URL

- **Function:** `createSupportTicketFromWebsite`
- **URL:** `https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app`
- **Region:** `us-central1`
- **Environment Variable:** `FIREBASE_CLOUD_FUNCTION_URL`

---

## Setup Instructions

### Step 1: Create Secret in Cloud Secret Manager

```bash
# Create the secret with the Cloud Function URL
echo -n "https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app" | \
  firebase apphosting:secrets:set firebase-cloud-function-url --data-file - --force
```

When prompted, select **Production** (not local testing).

### Step 2: Grant Access to App Hosting Backend

```bash
# Grant the App Hosting backend access to the secret
firebase apphosting:secrets:grantaccess firebase-cloud-function-url --backend aiworkoutgenerator-hub
```

**Important:** This step is critical! Without granting access, the build will fail with a permission error.

### Step 3: Configure apphosting.yaml

Add the environment variable reference to `apphosting.yaml`:

```yaml
env:
  # ... other environment variables ...

  # Support Ticket Cloud Function URL
  - variable: FIREBASE_CLOUD_FUNCTION_URL
    secret: firebase-cloud-function-url
```

### Step 4: Commit and Deploy

```bash
# Commit the apphosting.yaml changes
git add apphosting.yaml
git commit -m "feat: add FIREBASE_CLOUD_FUNCTION_URL to App Hosting config"
git push origin main
```

Firebase App Hosting will automatically:

- Detect the push to main
- Pull the latest code
- Access the secret from Cloud Secret Manager
- Build and deploy with the environment variable available at runtime

---

## Verification

### Check Secret Access

```bash
# Verify the secret exists and is accessible
firebase apphosting:secrets:access firebase-cloud-function-url
```

### Test Support Ticket Submission

1. Go to production: `https://aiworkoutgenerator-hub--ai-workout-generator-hub.asia-southeast1.hosted.app`
2. Click the support FAB (Help / Feedback button)
3. Submit a test ticket
4. Should see success message (not "Support ticket service is not configured")

### Check Deployment Logs

Monitor the deployment in Firebase Console:

- Firebase Console → App Hosting → `aiworkoutgenerator-hub` → View deployments

---

## Troubleshooting

### Error: "Misconfigured Secret"

**Error Message:**

```
Error resolving secret version with name=projects/ai-workout-generator-hub/secrets/firebase-cloud-function-url/versions/latest
Permission 'secretmanager.versions.get' denied
```

**Solution:**
Grant access to the secret:

```bash
firebase apphosting:secrets:grantaccess firebase-cloud-function-url --backend aiworkoutgenerator-hub
```

### Error: "Support ticket service is not configured"

**Possible Causes:**

1. Secret not created
2. Secret access not granted
3. `apphosting.yaml` not updated
4. Deployment not completed

**Solution:**

1. Verify secret exists: `firebase apphosting:secrets:access firebase-cloud-function-url`
2. Grant access: `firebase apphosting:secrets:grantaccess firebase-cloud-function-url --backend aiworkoutgenerator-hub`
3. Check `apphosting.yaml` has the variable reference
4. Trigger new deployment: `git commit --allow-empty -m "trigger redeploy" && git push origin main`

---

## Related Documentation

- [Firebase App Hosting Environment Variables](../../FIREBASE_APP_HOSTING_ENV_VARS.md) - General App Hosting secret management
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [get-cloud-function-url.ts](./get-cloud-function-url.ts) - Utility script to retrieve Cloud Function URL
