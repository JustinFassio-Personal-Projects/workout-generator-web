# AI Workout Generator

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🚀 Getting Started

This project is an AI-powered workout and nutrition generator. It's built with the following technologies:

- **Framework:** [Next.js](https://nextjs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **Database:** [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Deployment:** [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) (`aiworkoutgenerator-hub` backend; production custom domain `app.aiworkoutgenerator.com`). Env/secrets: `apphosting.yaml` + [docs/FIREBASE_APP_HOSTING_ENV_VARS.md](docs/FIREBASE_APP_HOSTING_ENV_VARS.md).

### Prerequisites

Make sure you have Node.js and npm installed.

### Environment Variables Setup

This project uses Firebase and requires environment variables for configuration. Follow these steps:

1. Create a `.env.local` file in the repo root.

2. Update the values in `.env.local` with your Firebase project credentials. You can find these in your [Firebase Console](https://console.firebase.google.com/) under Project Settings > General > Your apps > SDK setup and configuration.

3. Set the required environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

   Optional (for Firebase Analytics):
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Note:** The `.env.local` file is gitignored and should never be committed to the repository.

**Using real Firebase (production):** Do not set `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` or `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` in `.env.local`. If those are set, the app will try to reach the Firebase emulator on localhost. If the emulator isn't running you'll see `ERR_CONNECTION_REFUSED` and "auth/network-request-failed". Remove or comment out those two variables when using your real Firebase project.

### Running the Development Server

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 🔥 Firebase Configuration

This project uses Firebase for backend services including authentication and Firestore database. The Firebase configuration is managed through environment variables for security.

See the [Environment Variables Setup](#environment-variables-setup) section above for instructions on configuring Firebase credentials.

### Firebase project + Firestore deploys

This repo pins the Firebase CLI default project in [`.firebaserc`](.firebaserc).

- Deploy Firestore rules: `npx firebase deploy --only firestore:rules`
- Deploy Firestore indexes: `npx firebase deploy --only firestore:indexes`

### Seeding reference data (production guarded)

This repo includes a Firestore reference-data seeding script with production guardrails:

- Dry-run (safe): `npm run seed:firestore:prod:dry`
- Write to production (requires explicit confirmation flag): `npm run seed:firestore:prod`
- Seed Firestore emulator (for local development/testing): `npm run seed:firestore:emulator` (requires emulators to be running via `npm run firebase:emulators`)
- Seed session reports in emulator (for testing the iteration workflow): `npm run seed:workout-summaries:emulator -- <USER_UID>` — see [docs/firebase-emulator-suite/SESSION_REPORTS_AND_ITERATION.md](docs/firebase-emulator-suite/SESSION_REPORTS_AND_ITERATION.md)

### Firebase Hosting Rewrite Rules

The `firebase.json` file includes a rewrite rule that redirects all requests to `/index.html`. This is appropriate for single-page applications (SPAs) with client-side routing:

- Firebase Hosting serves actual static files (images, CSS, JS) directly when they exist
- The rewrite only applies to routes without corresponding files (for client-side routing)
- For Next.js static export, static pages are generated as HTML files and served directly

**Note:** If you add multiple static pages and want direct access to them, you may need to:

1. Remove the rewrite rule entirely (let Firebase serve static files directly)
2. Or use more specific rewrite patterns that exclude static page routes

See [Firebase Hosting documentation](https://firebase.google.com/docs/hosting/full-config#rewrites) for more details.

## Learn More

To learn more about the technologies used in this project, check out the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - learn about Tailwind CSS.
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) - learn about shadcn/ui.
- [Firebase Documentation](https://firebase.google.com/docs) - learn about Firebase.
