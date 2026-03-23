import admin from "firebase-admin";
import { getAppCheck } from "firebase-admin/app-check";
import type { ServiceAccount } from "firebase-admin";

/**
 * Check if we're in a build context (no runtime).
 * During Next.js build, we don't have access to runtime credentials.
 */
function isBuildTime(): boolean {
  // Next.js sets this during build
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Initialize Firebase Admin SDK for server-side operations (lazy).
 *
 * Environment Variables Required:
 * - FIREBASE_SERVICE_ACCOUNT_KEY: JSON string of service account credentials
 *   OR
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON file
 *
 * In development with emulators:
 * - FIRESTORE_EMULATOR_HOST: e.g., "127.0.0.1:8080"
 * - FIREBASE_AUTH_EMULATOR_HOST: e.g., "127.0.0.1:9099"
 *
 * Note: Firebase Admin SDK automatically detects and uses emulators when
 * these environment variables are set. No explicit connection needed.
 */
function initializeFirebaseAdmin(): admin.app.App | null {
  // Skip initialization during build time
  if (isBuildTime()) {
    console.log("[Firebase Admin] Skipping initialization during build");
    return null;
  }

  // When using production credentials, ignore emulator env vars so Admin SDK uses live Firebase.
  // Otherwise tokens from production Auth fail verification and Firestore connects to 127.0.0.1:8080.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    if (
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST
    ) {
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      console.log(
        "[Firebase Admin] Using live Firebase (emulator env vars cleared because FIREBASE_SERVICE_ACCOUNT_KEY is set)."
      );
    }
  }

  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Check if we're using emulators (after potential clear above)
  const isUsingEmulators =
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (isUsingEmulators) {
    console.log("[Firebase Admin] Using emulators:");
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log(`  Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    }
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      console.log(`  Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
    }
  }

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
      const saProjectId = serviceAccount.project_id;
      const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (saProjectId && clientProjectId && saProjectId !== clientProjectId) {
        console.error(
          "[Firebase Admin] PROJECT MISMATCH: service account project_id=%s but NEXT_PUBLIC_FIREBASE_PROJECT_ID=%s. verifyIdToken will fail.",
          saProjectId,
          clientProjectId
        );
      }
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: saProjectId ?? clientProjectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format");
    }
  }

  // Fall back to Application Default Credentials (for Cloud Run, Cloud Functions, etc.)
  // or GOOGLE_APPLICATION_CREDENTIALS environment variable
  // For emulators, we can initialize without credentials
  try {
    return admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error("[Firebase Admin] Failed to initialize:", error);
    // Return null during build if ADC fails
    return null;
  }
}

/**
 * Get the Firebase Admin app instance (lazy initialization).
 * Throws if called during build time or if initialization fails.
 */
function getAdminApp(): admin.app.App {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error(
      "Firebase Admin not initialized. This may occur during build time."
    );
  }
  return app;
}

/**
 * Get Firebase Auth instance (lazy).
 */
function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

/**
 * Get Firestore instance (lazy).
 */
function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

// Export lazy getters for Auth and Firestore
export const adminAuth = {
  verifyIdToken: (idToken: string) => getAdminAuth().verifyIdToken(idToken),
  getUser: (uid: string) => getAdminAuth().getUser(uid),
  setCustomUserClaims: (uid: string, claims: object) =>
    getAdminAuth().setCustomUserClaims(uid, claims),
  createUser: (properties: admin.auth.CreateRequest) =>
    getAdminAuth().createUser(properties),
};

export const adminDb = {
  collection: (path: string) => getAdminDb().collection(path),
  doc: (path: string) => getAdminDb().doc(path),
  batch: () => getAdminDb().batch(),
  runTransaction: <T>(
    updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>
  ) => getAdminDb().runTransaction(updateFunction),
};

/**
 * Verify a Firebase ID token and return the decoded token.
 * Use this in API routes to authenticate requests.
 *
 * @param idToken - The Firebase ID token from the Authorization header
 * @returns Decoded token with user information
 * @throws Error if token is invalid or expired
 */
export async function verifyIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken);
}

/**
 * Verify a Firebase App Check token from the X-Firebase-AppCheck header.
 * Use when FIREBASE_APP_CHECK_ENABLED is set to enforce bot protection.
 *
 * @param token - The App Check token from the request header
 * @returns Decoded App Check token claims
 * @throws Error if token is invalid or expired
 */
export async function verifyAppCheckToken(token: string) {
  if (isBuildTime()) {
    throw new Error("App Check verification not available at build time");
  }
  const appCheck = getAppCheck(getAdminApp());
  return appCheck.verifyToken(token);
}

/**
 * Get user's custom claims (role, subscription tier, etc.)
 *
 * @param uid - User's Firebase UID
 * @returns Custom claims object
 */
export async function getUserClaims(uid: string) {
  const user = await getAdminAuth().getUser(uid);
  return user.customClaims || {};
}

/**
 * Set custom claims on a user (for subscription tier updates, role changes, etc.)
 *
 * @param uid - User's Firebase UID
 * @param claims - Claims to set/update
 */
export async function setUserClaims(
  uid: string,
  claims: Record<string, unknown>
) {
  const existingClaims = await getUserClaims(uid);
  await getAdminAuth().setCustomUserClaims(uid, {
    ...existingClaims,
    ...claims,
  });
}
