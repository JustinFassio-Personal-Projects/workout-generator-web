import * as functions from "firebase-functions";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Write audit log entry for user creation.
 * Non-blocking - failures are logged but don't throw errors.
 * Uses deterministic document ID for idempotency (prevents duplicates on retries).
 * This ensures audit logs are written even on retries when user document already exists.
 */
async function writeAuditLog(user: functions.auth.UserRecord): Promise<void> {
  try {
    // Use deterministic document ID for idempotency
    // Format: {userId}_user:created
    // This ensures retries overwrite the same log entry instead of creating duplicates
    const auditLogId = `${user.uid}_user:created`;
    const auditLogRef = db.collection("audit_logs").doc(auditLogId);

    await auditLogRef.set({
      action: "user:created",
      actor_id: "system",
      actor_email: "system@firebase-auth.internal",
      actor_role: "system",
      resource_type: "user",
      resource_id: user.uid,
      details: {
        email: user.email,
        provider: user.providerData?.[0]?.providerId || "unknown",
        trigger: "onUserCreated",
      },
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking: log error but don't throw
    // Audit log failure shouldn't fail the entire function
    console.error(
      `⚠️ Failed to write audit log for user ${user.uid} (non-critical):`,
      error
    );
  }
}

/**
 * Cloud Function: Create Firestore user document when a new user signs up
 *
 * Triggers on: Firebase Auth user creation
 * Creates: Document in `users` collection with user profile data
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const userId = user.uid;

  console.log(`Creating Firestore document for new user: ${userId}`);

  try {
    // Check if document already exists (edge case or retry after partial failure)
    const userRef = db.collection("users").doc(userId);
    const existingDoc = await userRef.get();

    if (existingDoc.exists) {
      console.log(
        `User document already exists for ${userId}, skipping creation`
      );
      // Still attempt audit log write (handles retry scenario where
      // user document was created but audit log failed)
      // Fire-and-forget: don't await to avoid blocking function completion
      void writeAuditLog(user);
      return;
    }

    // Create user document
    const userData = {
      email: user.email || "",
      display_name: user.displayName || user.email?.split("@")[0] || "User",
      photo_url: user.photoURL || null,
      created_at: user.metadata.creationTime
        ? Timestamp.fromDate(new Date(user.metadata.creationTime))
        : FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      last_login: null,
      is_active: true,

      // Subscription defaults
      subscription_tier: "free",
      subscription_status: "none",
      stripe_customer_id: null,

      // Profile defaults
      preferences: {},
      onboarding_completed: false,
    };

    await userRef.set(userData);

    console.log(
      `✓ Created Firestore document for user: ${userId} (${user.email})`
    );

    // Write audit log (non-blocking - fire-and-forget, failures are logged but don't throw)
    void writeAuditLog(user);
  } catch (error) {
    console.error(
      `❌ Failed to create Firestore document for user ${userId}:`,
      error
    );
    throw error; // Re-throw to mark function as failed
  }
});
