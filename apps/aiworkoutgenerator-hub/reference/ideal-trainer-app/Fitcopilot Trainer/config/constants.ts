/**
 * Application Configuration Constants
 *
 * Centralized configuration for external URLs and app settings.
 */

/**
 * Hub Application URL
 *
 * The main FitCopilot Hub where users sign up and manage their account.
 * This should be set via NEXT_PUBLIC_HUB_URL environment variable.
 *
 * - Production: https://www.fitcopilot.app
 * - Development: http://localhost:5173
 */
export const HUB_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_HUB_URL) ||
  (typeof process !== 'undefined' && process.env.VITE_HUB_URL) ||
  'https://www.fitcopilot.app';

/**
 * Legacy: Allowed origins for postMessage security
 *
 * DEPRECATED: This constant is no longer used. The app now uses schema-based SSO
 * (URL-based token exchange) instead of postMessage-based SSO.
 *
 * Kept for potential future use or reference. Can be removed if not needed.
 *
 * @deprecated Replaced by schema-based SSO. See services/SchemaBasedSSO.ts
 */
const productionOrigins = [
  HUB_URL, // Should be HTTPS in production
  // Add other production app URLs here if needed (e.g., Trainer, Chef)
];

const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

/**
 * @deprecated No longer used - app uses schema-based SSO instead of postMessage
 * Kept for reference only. Can be removed if not needed.
 */
export const ALLOWED_SSO_ORIGINS = [
  ...productionOrigins,
  ...(typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
    ? developmentOrigins
    : []),
];

// Production security check removed - no longer needed without postMessage SSO
