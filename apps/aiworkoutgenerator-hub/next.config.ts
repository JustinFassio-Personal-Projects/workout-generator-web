import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { loadEnvConfig } from "@next/env";

// Load .env.local from this app's directory so env is correct when run from monorepo root (e.g. turbo run dev --filter=ai-workout-generator-hub)
const appDir = path.resolve(process.cwd());
loadEnvConfig(appDir);

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
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

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
