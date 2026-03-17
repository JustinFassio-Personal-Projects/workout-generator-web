# Fix Deployment: Missing Stripe Secrets

## Issue

Deployment failed with error:

```
Error resolving secret version with name=projects/ai-workout-generator-hub/secrets/stripe-basic-price-id/versions/latest
```

## Root Cause

The Stripe secrets referenced in `apphosting.yaml` don't exist in Cloud Secret Manager yet, or the App Hosting backend doesn't have access to them.

## Solution

### Quick Fix: Grant Access to Existing Secrets

If the secrets already exist in Cloud Secret Manager (check at [Google Cloud Console](https://console.cloud.google.com/security/secret-manager?project=ai-workout-generator-hub)), you just need to grant the App Hosting backend access to them (required after creating new secrets or if you see "Permission denied" / "Error resolving secret version"):

```bash
firebase apphosting:secrets:grantaccess stripe-secret-key,stripe-publishable-key,stripe-basic-price-id,stripe-pro-price-id,stripe-elite-price-id,stripe-coach-price-id,stripe-coach-pro-price-id,stripe-webhook-secret --backend aiworkoutgenerator-hub
```

Replace `aiworkoutgenerator-hub` with your actual backend ID (find it with `firebase apphosting:backends:list`).

### Step 1: Get Your Stripe Values (If Creating New Secrets)

You need to collect the following from your Stripe Dashboard:

1. **Stripe Secret Key**: `sk_test_...` (development) or `sk_live_...` (production)
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/) > **Developers** > **API keys**
   - **Important**: Use `sk_test_...` keys for development and testing. Only use `sk_live_...` keys in production environments to avoid accidental charges or data exposure.

2. **Stripe Publishable Key**: `pk_test_...` (development) or `pk_live_...` (production)
   - Same API keys page as above; use the Publishable key. For production App Hosting, use `pk_live_...` so the client uses live mode.

3. **Stripe Price IDs**: `price_...` for each tier
   - Go to **Products** > Click each product > **Pricing** section
   - Copy the **Price ID** (make sure it's the active one)
   - Needed for: Basic, Pro, Elite, Coach, Coach Pro
   - **For production**: Switch the Stripe Dashboard to **Live** mode before copying price IDs; test-mode price IDs do not work with live API keys.

4. **Stripe Webhook Secret** (optional): `whsec_...`
   - Go to **Developers** > **Webhooks** > Your webhook > **Signing secret**

### Step 2: Create Secrets Using Firebase CLI

Run these commands, replacing the placeholder values with your actual Stripe values:

```bash
# Set Stripe Secret Key
# WARNING: For production App Hosting backends, use your LIVE key (sk_live_...). Using sk_test_ here will put the live site in sandbox.
# Use sk_test_... only for non-production/preview backends.
echo -n "sk_live_YOUR_SECRET_KEY_HERE" | firebase apphosting:secrets:set stripe-secret-key --data-file - --force

# Set Stripe Publishable Key (use pk_live_... for production so the client uses live mode)
echo -n "pk_live_YOUR_PUBLISHABLE_KEY_HERE" | firebase apphosting:secrets:set stripe-publishable-key --data-file - --force

# For production, use price IDs copied from the Stripe Dashboard while in Live mode.
# Set Stripe Basic Price ID
echo -n "price_YOUR_BASIC_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-basic-price-id --data-file - --force

# Set Stripe Pro Price ID
echo -n "price_YOUR_PRO_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-pro-price-id --data-file - --force

# Set Stripe Elite Price ID
echo -n "price_YOUR_ELITE_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-elite-price-id --data-file - --force

# Set Stripe Coach Price ID
echo -n "price_YOUR_COACH_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-coach-price-id --data-file - --force

# Set Stripe Coach Pro Price ID
echo -n "price_YOUR_COACH_PRO_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-coach-pro-price-id --data-file - --force

# Set Stripe Webhook Secret (optional)
echo -n "whsec_YOUR_WEBHOOK_SECRET_HERE" | firebase apphosting:secrets:set stripe-webhook-secret --data-file - --force
```

**Important**: The `--force` flag automatically:

- Creates the secret in Cloud Secret Manager
- Grants necessary permissions to the App Hosting backend
- Updates `apphosting.yaml` if needed

### Step 3: Verify Secrets Were Created

You can verify a secret was created (but not view its value):

```bash
firebase apphosting:secrets:describe stripe-basic-price-id
```

### Step 4: Redeploy

After creating all secrets:

1. The secrets are now available to your App Hosting backend
2. Trigger a new deployment (push a commit or manually trigger)
3. The deployment should now succeed

## Troubleshooting

### "Secret already exists" error

- This is fine - the `--force` flag will update it
- Or use `grantaccess` if you just need to grant permissions

### "Permission denied" error

- Make sure you're authenticated: `firebase login`
- Make sure you have the correct project selected: `firebase use PROJECT_ID`
- Check that you have the necessary IAM permissions in Google Cloud

### 403 "The caller does not have permission" (Cloud Resource Manager)

This means your Google account does not have access to the GCP/Firebase project.

1. **Check if the project appears for your account**

   ```bash
   firebase projects:list
   ```

   If **ai-workout-generator-hub** is not in the list, your account is not a member of that project.

2. **Get access**
   - Ask a project Owner to add you:
     - **Firebase Console**: [Project Settings](https://console.firebase.google.com/) → your project → **Users and permissions** → **Add member** → add your email (e.g. `jlfassio@gmail.com`) with role **Editor** (or **Firebase App Hosting Admin** if available).
     - **Google Cloud Console**: [IAM](https://console.cloud.google.com/iam-admin/iam) for project `ai-workout-generator-hub` → **Grant access** → add your email with role **Editor** (or at least **Secret Manager Admin** + **Browser** for resourcemanager.projects.get).
   - After you’re added, run `firebase login --reauth` and try the `apphosting:secrets:set` commands again.

### Still getting deployment errors

- Verify all 9 secrets were created (8 required + 1 optional webhook), including stripe-publishable-key and stripe-secret-key with live keys (pk*live*..., sk*live*...) for production
- Check that secret names in `apphosting.yaml` match exactly
- Ensure you're using the correct Stripe keys (test vs live) for your environment
