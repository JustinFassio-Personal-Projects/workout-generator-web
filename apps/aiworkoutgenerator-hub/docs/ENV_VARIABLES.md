# Environment Variables Configuration

This document describes all environment variables used in the AI Workout Generator Hub project.

## Setup Instructions

1. Create a `.env.local` file in the project root
2. Copy the template below
3. Fill in your actual values (get from Firebase Console, Stripe Dashboard, etc.)
4. **Never commit `.env.local` to git** (it's in `.gitignore`)

## Required Variables

### Firebase Configuration

Get these from [Firebase Console](https://console.firebase.google.com/) > Project Settings > General > Your apps

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

## Optional Variables

### Firebase Analytics

```bash
# Only needed if you want to use Firebase Analytics
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
```

### Firebase Emulator Configuration (Development)

```bash
# Uncomment when using Firebase emulators for local development
# Format: hostname:port (without http:// prefix)
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5002
```

### Firebase Admin SDK (Server-side)

```bash
# For scripts only (seed-firestore-schema.ts)
# Get from Firebase Console > Project Settings > Service Accounts > Generate new private key
# Store the entire JSON content as a single-line string
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

### Multi-App Architecture URLs

```bash
# For future multi-app SSO implementation
NEXT_PUBLIC_HUB_URL=http://localhost:3000
NEXT_PUBLIC_TRAINER_URL=http://localhost:3001
NEXT_PUBLIC_CHEF_URL=http://localhost:3002
```

### Stripe Configuration

```bash
# Get from Stripe Dashboard > Developers > API keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Stripe Price IDs (active)
# Get from Stripe Dashboard > Products > [Product] > Pricing
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ELITE_PRICE_ID=price_...
```

### AI / Gemini API

```bash
# Get from Google AI Studio: https://makersuite.google.com/app/apikey
GOOGLE_AI_API_KEY=your_gemini_api_key
```

### Vertex AI / Imagen API (Image Generation)

```bash
# Get from Google Cloud Console: https://console.cloud.google.com
# Required for exercise image generation feature
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1 # Optional, defaults to us-central1
# Service account key with Vertex AI permissions (aiplatform.endpoints.predict)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

### Support Ticket Cloud Function

```bash
# URL for the support ticket creation Cloud Function
# Deployed in the Admin repository
FIREBASE_CLOUD_FUNCTION_URL=https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app
# Optional: Function key for authentication (if enabled)
# FIREBASE_FUNCTION_KEY=your-function-key-here
```

### Monitoring & Analytics (Production)

```bash
# Sentry for error tracking: https://sentry.io
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=... # for uploading source maps

# PostHog for product analytics: https://posthog.com
# Use the ingestion host (not the web UI at app.posthog.com)
# US Cloud: https://us.i.posthog.com
# EU Cloud: https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Complete Template

Copy this to `.env.local`:

```bash
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Analytics (Optional)
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Emulator (Development Only)
# NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
# NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=localhost:8080
# NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST=localhost:5002

# Firebase Admin SDK (Scripts Only)
# FIREBASE_SERVICE_ACCOUNT_KEY=

# Multi-App URLs (Future)
# NEXT_PUBLIC_HUB_URL=http://localhost:3000
# NEXT_PUBLIC_TRAINER_URL=http://localhost:3001
# NEXT_PUBLIC_CHEF_URL=http://localhost:3002

# Stripe
# STRIPE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
# STRIPE_BASIC_PRICE_ID=
# STRIPE_PRO_PRICE_ID=
# STRIPE_ELITE_PRICE_ID=

# AI / Gemini
# GOOGLE_AI_API_KEY=

# Vertex AI / Imagen (Image Generation)
# GOOGLE_CLOUD_PROJECT_ID=
# GOOGLE_CLOUD_LOCATION=us-central1 # Optional, defaults to us-central1
# GOOGLE_APPLICATION_CREDENTIALS_JSON=

# Support Ticket Cloud Function
# FIREBASE_CLOUD_FUNCTION_URL=https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app
# FIREBASE_FUNCTION_KEY= # Optional, if function key authentication is enabled

# Monitoring (Production)
# NEXT_PUBLIC_SENTRY_DSN=
# SENTRY_AUTH_TOKEN=
# NEXT_PUBLIC_POSTHOG_KEY=
# NEXT_PUBLIC_POSTHOG_HOST=
```

## Notes

- `NEXT_PUBLIC_*` variables are exposed to the browser bundle
- Non-prefixed variables are server-side only
- After adding/changing env vars, restart the dev server
- In production (Vercel/Firebase Hosting), set these in the deployment dashboard

## Security

⚠️ **Never commit sensitive values to git**

- `.env.local` is in `.gitignore`
- Use separate values for development and production
- Rotate keys if accidentally exposed
- Use Firebase App Check and Stripe webhook signing for additional security
