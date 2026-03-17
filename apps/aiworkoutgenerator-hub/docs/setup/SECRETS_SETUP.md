# Setting Up Repository Secrets

This guide explains how to configure the Firebase secrets for this repository in different environments.

## Overview

Firebase configuration values have been moved from hardcoded values in the source code to environment variables for security. This means you need to configure these secrets in your deployment environment.

## Required Environment Variables

The following environment variables must be set:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Optional Environment Variables

- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Required only if you want to use Firebase Analytics/Google Analytics

## Local Development

For local development, create a `.env.local` file (repo root) and fill in your Firebase project values from the [Firebase Console](https://console.firebase.google.com/).

## GitHub Actions (CI/CD)

To use these secrets in GitHub Actions workflows:

1. Go to your repository on GitHub
2. Click on **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each environment variable with its corresponding value from your Firebase project

In your GitHub Actions workflow files, you can then access these secrets:

```yaml
- name: Build
  env:
    NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
    NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
  run: npm run build
```

## Vercel Deployment

If deploying to Vercel:

1. Go to your project dashboard on Vercel
2. Navigate to **Settings** > **Environment Variables**
3. Add each environment variable with its value
4. Make sure to select the appropriate environments (Production, Preview, Development)

## Firebase Hosting

If deploying to Firebase Hosting, you can set environment variables in your build process:

1. Create a `.env.production` file (locally, don't commit it)
2. Add your production Firebase values
3. Use Firebase CLI to deploy with environment variables configured

Alternatively, use Firebase Hosting's environment configuration features.

## Where to Find Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon (⚙️) and select **Project Settings**
4. Scroll down to **Your apps** section
5. Select your web app or create a new one
6. Under **SDK setup and configuration**, select **Config**
7. Copy the values from the configuration object

## Security Note

⚠️ **Important:** While these are `NEXT_PUBLIC_*` variables (which means they are exposed in the client-side JavaScript bundle), they are still considered sensitive. The `NEXT_PUBLIC_` prefix is required by Next.js to make them available in the browser.

Firebase security should be enforced through Firebase Security Rules and Firebase App Check, not by hiding these configuration values.

## Firestore seeding (reference data)

This repo includes a Firestore reference-data seeding script intended for controlled runs.

- Dry-run (recommended first): `npm run seed:firestore:prod:dry`
- Production write (requires an explicit confirmation flag in the script invocation): `npm run seed:firestore:prod`
- Local development using the Firebase Emulator Suite: `npm run seed:firestore:emulator` (requires emulators to be running via `npm run firebase:emulators`)
