# Firebase Service Account Key Setup

## Issue

The `/api/workouts/map-images` endpoint requires `FIREBASE_SERVICE_ACCOUNT_KEY` to query the production `master_exercise_images` collection. This secret is missing in production, causing 500 errors.

## Root Cause

1. **Missing Environment Variable**: `FIREBASE_SERVICE_ACCOUNT_KEY` is not configured in `apphosting.yaml`
2. **Code Dependency**: The old code tried to use `@google-cloud/firestore` directly, which isn't installed

## Solution

### Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ai-workout-generator-hub**
3. Go to **Project Settings** (gear icon) > **Service Accounts** tab
4. Click **Generate New Private Key**
5. Click **Generate Key** in the confirmation dialog
6. A JSON file will download - this is your service account key

**Important**: Keep this file secure! It provides full access to your Firebase project.

### Step 2: Create the Secret in Cloud Secret Manager

The service account key is a JSON object. You need to set it as a **string** in the secret:

```bash
# Read the JSON file and set it as a secret
# Replace 'path/to/serviceAccountKey.json' with your downloaded file path
cat path/to/serviceAccountKey.json | firebase apphosting:secrets:set firebase-service-account-key --data-file - --force
```

**Alternative method** (if you have the JSON content as a string):

```bash
# If you have the JSON content, you can pipe it directly
echo -n '{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}' | firebase apphosting:secrets:set firebase-service-account-key --data-file - --force
```

The `--force` flag automatically:

- Creates the secret in Cloud Secret Manager
- Grants necessary permissions to the App Hosting backend
- Updates `apphosting.yaml` if needed

### Step 3: Grant Access to the Secret

If you need to grant access separately:

```bash
firebase apphosting:secrets:grantaccess firebase-service-account-key \
  --backend aiworkoutgenerator-hub \
  --location asia-southeast1
```

### Step 4: Verify the Secret

You can verify the secret was created (but not view its value):

```bash
firebase apphosting:secrets:describe firebase-service-account-key
```

### Step 5: Redeploy

After creating the secret:

1. The secret is now available to your App Hosting backend
2. Push the updated code (which fixes the `getProductionDb()` function)
3. The deployment should now succeed and the `/api/workouts/map-images` endpoint should work

## Code Changes

The code has been updated to:

- Use Firebase Admin SDK directly (no dependency on `@google-cloud/firestore`)
- Provide better error messages for missing/invalid service account key
- Handle JSON parsing errors gracefully

## Troubleshooting

### "Secret already exists" error

- This is fine - the `--force` flag will update it
- Or use `grantaccess` if you just need to grant permissions

### "Permission denied" error

- Make sure you're authenticated: `firebase login`
- Make sure you have the correct project selected: `firebase use ai-workout-generator-hub`
- Check that you have the necessary IAM permissions in Google Cloud

### Still getting 500 errors after setup

- Verify the secret was created: `firebase apphosting:secrets:describe firebase-service-account-key`
- Check that the JSON is valid (no extra whitespace, proper escaping)
- Ensure the service account has Firestore read permissions
- Check App Hosting logs for detailed error messages

### JSON parsing errors

- Make sure the entire JSON object is on a single line when setting the secret
- Use `cat` to read from file rather than copying/pasting (avoids formatting issues)
- Verify the JSON is valid: `cat serviceAccountKey.json | jq .` (should not error)

## Security Notes

- The service account key provides full access to your Firebase project
- Store it securely in Cloud Secret Manager (never commit to git)
- Rotate the key periodically for security best practices
- The key is only accessible to the App Hosting backend at runtime
