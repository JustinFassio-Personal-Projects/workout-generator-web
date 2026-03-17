// Import the functions you need from the SDKs you need
import { initializeApp, getApp } from "firebase/app";
import {
  initializeAppCheck,
  getToken,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { connectAuthEmulator, getAuth, Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  Firestore,
} from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getEnvAwareErrorMessage } from "@/lib/utils";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env
    .NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID && {
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  }),
};

// Placeholder values from .env.example — if these are present, Firebase is not configured
const FIREBASE_PLACEHOLDERS = [
  "your_api_key_here",
  "your-project-id",
  "your-project-id.firebaseapp.com",
  "your-project-id.appspot.com",
  "your_messaging_sender_id",
  "your_app_id",
];

// Exact match only — avoid treating real project IDs like "my-company-your-project-id" as placeholder
function isPlaceholder(value: string | undefined): boolean {
  if (!value || typeof value !== "string") return true;
  const v = value.trim();
  return !v || FIREBASE_PLACEHOLDERS.some((p) => v === p);
}

// True when config is missing or still has .env.example placeholders (avoids connecting and getting auth/network-request-failed)
export const isFirebaseConfigValid =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.storageBucket &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId &&
  !isPlaceholder(firebaseConfig.apiKey) &&
  !isPlaceholder(firebaseConfig.projectId) &&
  !isPlaceholder(firebaseConfig.authDomain);

// Validate Firebase configuration by checking actual config values
// This is more reliable than checking process.env directly, especially in client bundles
// where Next.js replaces env vars at build time
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

// Check for missing config values
// Note: With Next.js static export, missing env vars are replaced with undefined (the value)
// at build time, not the string "undefined", so we only check for falsy values
const missingConfigKeys = requiredConfigKeys.filter(
  (key) => !firebaseConfig[key]
);

if (missingConfigKeys.length > 0) {
  const envHint = getEnvAwareErrorMessage(
    "Please check your .env.local file and restart the dev server. See .env.example for the list of required variables.",
    "Please check your deployment environment variables configuration. For Firebase App Hosting, ensure secrets are configured in Cloud Secret Manager and referenced in apphosting.yaml."
  );
  const errorMessage = `Missing required Firebase configuration values: ${missingConfigKeys.join(", ")}. ${envHint}`;

  // Always log warning but don't throw to allow app to load
  // Firebase will fail gracefully when actually used if config is invalid
  // This prevents the app from crashing during static export
  console.warn(`[Firebase Config] ${errorMessage}`);

  // Don't throw in static export mode - let the app load and show errors in UI
  if (typeof window !== "undefined") {
    console.error(`[Firebase Config] ${errorMessage}`);
  }
}

if (
  !isFirebaseConfigValid &&
  missingConfigKeys.length === 0 &&
  typeof window !== "undefined"
) {
  console.warn(
    "[Firebase Config] Firebase appears to be using placeholder values from .env.example. " +
      "Copy .env.example to .env.local and set your real Firebase project values (or use the Firebase emulator). " +
      "Skipping Firebase initialization to avoid 'auth/network-request-failed' errors."
  );
} else if (
  isFirebaseConfigValid &&
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined"
) {
  console.info(
    "[Firebase Config] Loaded from .env.local — projectId:",
    firebaseConfig.projectId
  );
}

// Initialize Firebase
// Only initialize in browser environment to prevent SSR errors
// If initialization fails, app/auth/db will be null and getter functions will throw clear errors
let app: ReturnType<typeof initializeApp> | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let appCheck: AppCheck | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function maybeConnectAuthEmulator(authInstance: Auth) {
  // Next.js only exposes NEXT_PUBLIC_* to the client bundle
  const host =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim() ?? "";
  if (!host) {
    // Only log in development - in production, not using emulator is expected
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Firebase] Auth emulator not configured. Set NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST to connect to emulator."
      );
    }
    return;
  }
  if (authEmulatorConnected) return;

  // `connectAuthEmulator` MUST be called before any other auth operations
  // It expects a URL without the protocol prefix
  console.log(`[Firebase] Connecting Auth emulator to http://${host}`);
  try {
    connectAuthEmulator(authInstance, `http://${host}`, {
      disableWarnings: true,
    });
    authEmulatorConnected = true;
    console.log(`[Firebase] Auth emulator connected successfully`);
  } catch (error) {
    console.error("[Firebase] Failed to connect Auth emulator:", error);
    // Don't throw - allow app to continue, but emulator won't work
  }
}

function maybeConnectFirestoreEmulator(firestoreInstance: Firestore) {
  const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim() ?? "";
  if (!host) {
    // Only log in development - in production, not using emulator is expected
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Firebase] Firestore emulator not configured. Set NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST to connect to emulator."
      );
    }
    return;
  }
  if (firestoreEmulatorConnected) return;

  // Parse host:port from environment variable
  const [hostname, portStr] = host.split(":");
  const port = parseInt(portStr, 10);
  if (!hostname || !port) {
    console.error(
      `[Firebase] Invalid Firestore emulator host format: ${host}. Expected format: hostname:port`
    );
    return;
  }

  console.log(
    `[Firebase] Connecting Firestore emulator to ${hostname}:${port}`
  );
  try {
    connectFirestoreEmulator(firestoreInstance, hostname, port);
    firestoreEmulatorConnected = true;
    console.log(`[Firebase] Firestore emulator connected successfully`);
  } catch (error) {
    console.error("[Firebase] Failed to connect Firestore emulator:", error);
    // Don't throw - allow app to continue, but emulator won't work
  }
}

function maybeInitializeAppCheck(appInstance: NonNullable<typeof app>) {
  if (appCheck) return;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
  const enabled =
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED === "1";
  if (!siteKey || !enabled) return;
  try {
    appCheck = initializeAppCheck(appInstance, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Firebase] App Check initialization failed:", message);
  }
}

if (typeof window !== "undefined") {
  if (!isFirebaseConfigValid) {
    // Skip init when config is missing or placeholders — avoids "auth/network-request-failed"
    // and Firestore "Could not reach Cloud Firestore backend" when .env.local not set up
    app = null;
    auth = null;
    db = null;
  } else {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      maybeInitializeAppCheck(app);
      maybeConnectAuthEmulator(auth);
      maybeConnectFirestoreEmulator(db);
    } catch (error) {
      console.error(
        "[Firebase] Initialization failed. Firebase operations will not work until configuration is fixed:",
        error
      );
      // Set to null - getter functions will throw clear errors when Firebase is actually used
      // This prevents masking configuration issues with a dummy Firebase instance
      app = null;
      auth = null;
      db = null;
    }
  }
} else {
  // In SSR context, skip initialization
  // This prevents module-level errors during SSR
  console.warn("[Firebase] Skipping initialization in SSR context");
}

/**
 * Get the Firebase Auth instance, initializing it if necessary
 * @returns Firebase Auth instance
 * @throws Error if called on server-side or if initialization fails
 */
export function getAuthInstance(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth can only be used on the client side");
  }
  if (!isFirebaseConfigValid) {
    throw new Error(
      "Firebase is not configured. Copy apps/aiworkoutgenerator-hub/.env.example to .env.local and set your Firebase project values (or set NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST and NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST to use the emulator)."
    );
  }
  if (!auth) {
    // Lazy initialization if not already done
    try {
      // Use existing app if available, otherwise initialize
      if (!app) {
        try {
          app = getApp(); // Try to get existing default app first
        } catch {
          // No existing app, create a new one
          app = initializeApp(firebaseConfig);
        }
      }
      maybeInitializeAppCheck(app);
      auth = getAuth(app);
      maybeConnectAuthEmulator(auth);
    } catch (error) {
      console.error("[Firebase] Lazy initialization error:", error);
      throw new Error(
        getEnvAwareErrorMessage(
          "Failed to initialize Firebase Auth. Please check your Firebase configuration in .env.local. See .env.example for required variables.",
          "Failed to initialize Firebase Auth. Please check your deployment environment variables. For Firebase App Hosting, ensure secrets are configured in Cloud Secret Manager."
        )
      );
    }
  }
  return auth;
}

/**
 * Get the Firebase Firestore instance, initializing it if necessary
 * @returns Firebase Firestore instance
 * @throws Error if called on server-side or if initialization fails
 */
export function getFirestoreInstance(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firebase Firestore can only be used on the client side");
  }
  if (!isFirebaseConfigValid) {
    throw new Error(
      "Firebase is not configured. Copy apps/aiworkoutgenerator-hub/.env.example to .env.local and set your Firebase project values (or set NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST to use the emulator)."
    );
  }
  if (!db) {
    // Lazy initialization if not already done
    try {
      // Use existing app if available, otherwise initialize
      if (!app) {
        try {
          app = getApp(); // Try to get existing default app first
        } catch {
          // No existing app, create a new one
          app = initializeApp(firebaseConfig);
        }
      }
      maybeInitializeAppCheck(app);
      db = getFirestore(app);
      maybeConnectFirestoreEmulator(db);
    } catch (error) {
      console.error("[Firebase] Lazy Firestore initialization error:", error);
      throw new Error(
        getEnvAwareErrorMessage(
          "Failed to initialize Firebase Firestore. Please check your Firebase configuration in .env.local. See .env.example for required variables.",
          "Failed to initialize Firebase Firestore. Please check your deployment environment variables. For Firebase App Hosting, ensure secrets are configured in Cloud Secret Manager."
        )
      );
    }
  }
  return db;
}

// Export auth and db directly for backward compatibility, but they may be null during SSR
export { auth, db };

// Initialize Analytics only in browser environment and if measurementId is provided
let analytics: Analytics | null = null;
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID &&
  app
) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("[Firebase] Analytics initialization failed:", error);
    // Analytics is optional, so we continue without it
    analytics = null;
  }
}

/**
 * Get a Firebase App Check token for custom API requests.
 * Attach as X-Firebase-AppCheck header when FIREBASE_APP_CHECK_ENABLED is set.
 * Returns null if App Check is not initialized (e.g. RECAPTCHA_SITE_KEY or APP_CHECK_ENABLED not set).
 */
export async function getAppCheckToken(
  forceRefresh = false
): Promise<string | null> {
  if (typeof window === "undefined" || !appCheck) return null;
  try {
    const result = await getToken(appCheck, forceRefresh);
    return result.token;
  } catch {
    return null;
  }
}

/**
 * Headers to attach to authenticated API requests (X-Firebase-AppCheck).
 * Spread into fetch headers when calling API routes: { Authorization: `Bearer ${idToken}`, ...(await getAppCheckHeaders()) }
 * Returns empty object if App Check is not enabled.
 */
export async function getAppCheckHeaders(): Promise<Record<string, string>> {
  const token = await getAppCheckToken();
  return token ? { "X-Firebase-AppCheck": token } : {};
}

export { app, analytics };
