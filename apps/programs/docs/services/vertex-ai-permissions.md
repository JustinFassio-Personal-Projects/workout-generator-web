# Vertex AI Permissions Fix - Production

## Project and account

**GCP project:** `ai-fitness-guy-26523278-3e978`  
**Use this project** for all Vertex AI calls (programs app and admin-dash-astro “Generate with AI” routes).

### Connecting apps to this project

Set **one** of these in each app’s `.env` (or Vercel/Firebase secrets) so requests go to this project:

- `GOOGLE_PROJECT_ID=ai-fitness-guy-26523278-3e978`
- or `PUBLIC_FIREBASE_PROJECT_ID=ai-fitness-guy-26523278-3e978` (same value; Firebase project id matches)

Optional: `GOOGLE_LOCATION=us-central1` (or another [Vertex AI region](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations)).

**Apps:**

- **programs** (`apps/programs`) – set in `.env` / Firebase App Hosting env.
- **admin-dash-astro** (`apps/admin-dash-astro`) – set in `.env` for local dev; set in Vercel (or host) env for deployed admin.

### Verify you’re on the right project

1. **Local:** In the app’s `.env`, confirm `GOOGLE_PROJECT_ID` or `PUBLIC_FIREBASE_PROJECT_ID` is `ai-fitness-guy-26523278-3e978`.
2. **gcloud:** `gcloud config get-value project` should match if you use Application Default Credentials (e.g. `gcloud auth application-default login`).
3. **Console:** In [Google Cloud Console](https://console.cloud.google.com/), ensure you’re in project `ai-fitness-guy-26523278-3e978` when enabling APIs or checking IAM.

---

## Issue

Production error: `403 Forbidden - Permission 'aiplatform.endpoints.predict' denied`

## Root Cause

Firebase App Hosting service accounts did not have the `roles/aiplatform.user` IAM role required to call Vertex AI API endpoints.

## Solution Applied

### Service Accounts Granted Permissions

1. **Firebase App Hosting Compute Service Account**
   - Service Account: `firebase-app-hosting-compute@ai-fitness-guy-26523278-3e978.iam.gserviceaccount.com`
   - Role Granted: `roles/aiplatform.user`
   - Command:
     ```bash
     gcloud projects add-iam-policy-binding ai-fitness-guy-26523278-3e978 \
       --member="serviceAccount:firebase-app-hosting-compute@ai-fitness-guy-26523278-3e978.iam.gserviceaccount.com" \
       --role="roles/aiplatform.user" \
       --condition=None
     ```

2. **Default Compute Service Account**
   - Service Account: `294607443271-compute@developer.gserviceaccount.com`
   - Role Granted: `roles/aiplatform.user`
   - Command:
     ```bash
     gcloud projects add-iam-policy-binding ai-fitness-guy-26523278-3e978 \
       --member="serviceAccount:294607443271-compute@developer.gserviceaccount.com" \
       --role="roles/aiplatform.user" \
       --condition=None
     ```

## Verification

### API Status

- ✅ Vertex AI API is enabled: `aiplatform.googleapis.com`
- ✅ Firebase Vertex AI API is enabled: `firebasevertexai.googleapis.com`

### Permissions Status

- ✅ `firebase-app-hosting-compute@ai-fitness-guy-26523278-3e978.iam.gserviceaccount.com` has `roles/aiplatform.user`
- ✅ `294607443271-compute@developer.gserviceaccount.com` has `roles/aiplatform.user`

## What This Fixes

The `roles/aiplatform.user` role grants the following permissions needed for Vertex AI API calls:

- `aiplatform.endpoints.predict` - Required for making predictions/chat completions
- `aiplatform.models.get` - Required for accessing model information
- Other Vertex AI read/use permissions

## Next Steps

1. **No code changes needed** - Permissions are now correctly configured
2. **No redeployment required** - IAM changes take effect immediately
3. **Test the API** - The `/api/ai/generate-program` endpoint should now work in production

## Additional Notes

- The Vertex AI API was already enabled (no action needed)
- Both service accounts were granted permissions to ensure coverage
- IAM changes propagate immediately (no waiting period)

## Date Fixed

2026-01-27
