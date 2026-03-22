import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { existsSync } from "fs";
import { loadEnvConfig } from "@next/env";

// Load .env.local from this app's directory. When run from monorepo root (e.g. turbo run dev --filter=ai-workout-generator-hub),
// process.cwd() may be the monorepo root—.env.local lives in apps/aiworkoutgenerator-hub. Resolve app dir explicitly.
const monorepoAppDir = path.join(process.cwd(), "apps", "aiworkoutgenerator-hub");
const appDir = existsSync(path.join(monorepoAppDir, "package.json"))
  ? monorepoAppDir
  : process.cwd();
loadEnvConfig(path.resolve(appDir));

const nextConfig: NextConfig = {
  // Inlines at build time (e.g. local or App Hosting if you add FIREBASE_WEBAPP_CONFIG to apphosting.yaml).
  // Must contain ONLY public web-app config (apiKey, authDomain, projectId, etc.) — inlined into client bundle. Never put secrets here.
  env: {
    FIREBASE_WEBAPP_CONFIG: process.env.FIREBASE_WEBAPP_CONFIG ?? "",
  },

  // NOTE: Static export is DISABLED to enable API routes
  // The project uses Next.js API routes for:
  //   - /api/workouts/generate (workout generation with Genkit)
  //   - /api/stripe/* (Stripe checkout and portal)
  //   - /api/webhooks/stripe (Stripe webhooks)
  //   - /api/image/generate (exercise image generation)
  //   - /api/admin/images (master image management)
  // See docs/STATIC_EXPORT_DECISION.md for architecture details
  // Deploy to: Vercel, Firebase Cloud Run, or similar SSR-capable platform

  // Exclude server-side packages from Turbopack bundling
  // These packages have native bindings or complex module resolution
  // that don't work well with bundlers - use Node.js require() instead
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "@google-cloud/storage",
    // Genkit pulls in express; keep it external so Turbopack doesn't bundle dynamic require()
    "express",
  ],

  // Image domains for next/image
  images: {
    remotePatterns: [
      // Placeholder images for development/testing
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      // Firebase Storage for production images
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

// Wrap with Sentry configuration for error tracking and source map uploads
// Sentry is optional - the app works without SENTRY_* environment variables
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options
  // Env-driven so forks/environments don't upload source maps to the wrong Sentry project (aligns with apphosting.yaml and CI).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Explicit auth token and URL so .env.local (or any env) is used; required for US org (https://us.sentry.io) to avoid 401
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sentryUrl: process.env.SENTRY_URL || "https://us.sentry.io",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // Set SENTRY_DISABLE_TUNNEL=1 in App Hosting to disable if /monitoring returns 403 (e.g. Cloud Run not honoring rewrites).
  // When disabled, events go directly to Sentry; ad-blockers may block them for some users.
  tunnelRoute:
    process.env.SENTRY_DISABLE_TUNNEL === "1" ? undefined : "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tag DOM elements with React component names for errors and Session Replay (Webpack only; no effect with Turbopack).
    reactComponentAnnotation: { enabled: true },

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
