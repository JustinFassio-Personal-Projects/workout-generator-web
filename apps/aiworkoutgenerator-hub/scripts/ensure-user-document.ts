#!/usr/bin/env tsx
/**
 * Script to ensure a user document exists in Firestore for an existing Auth user
 *
 * Usage:
 *   tsx scripts/ensure-user-document.ts [email] [uid]
 *
 * Example:
 *   tsx scripts/ensure-user-document.ts test@example.com J1hWZLpgNxb33ddcQ3aixEFKQhQQ
 */

import admin from "firebase-admin";

// Initialize Firebase Admin for emulator
function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Check if we're using emulators
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

  // For emulator, we don't need credentials
  // Firebase Admin SDK automatically detects emulators via environment variables
  return admin.initializeApp({
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ai-workout-generator-hub",
  });
}

async function ensureUserDocument(email: string, uid: string) {
  try {
    initializeAdmin();

    console.log("Ensuring user document exists for:", { email, uid });

    // Check if user exists in Auth
    try {
      const userRecord = await admin.auth().getUser(uid);
      console.log("✅ User found in Auth:", userRecord.email);
    } catch (authError: unknown) {
      if (
        authError &&
        typeof authError === "object" &&
        "code" in authError &&
        authError.code === "auth/user-not-found"
      ) {
        console.error(
          "❌ User not found in Auth. Please create the user first."
        );
        process.exit(1);
      }
      throw authError;
    }

    // Check if document exists in Firestore
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.log("✅ User document already exists in Firestore");
      const data = userDoc.data();
      console.log("  Current data:", Object.keys(data || {}));
    } else {
      console.log("⚠️  User document does not exist. Creating it...");

      // Create user document
      await userRef.set(
        {
          email,
          subscription_tier: "pro",
          subscription_status: "active",
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ User document created in Firestore");
    }

    // Verify it exists
    const verifyDoc = await userRef.get();
    if (verifyDoc.exists) {
      console.log("\n🎉 User document verified!");
      console.log("Email:", email);
      console.log("UID:", uid);
      console.log("Document ID:", verifyDoc.id);
      console.log("Document data keys:", Object.keys(verifyDoc.data() || {}));
    } else {
      console.error("❌ Failed to verify user document");
      process.exit(1);
    }

    return uid;
  } catch (error) {
    console.error("❌ Error ensuring user document:", error);
    throw error;
  }
}

// Main execution
// Default values provided for convenience (can be overridden via command line args)
const email = process.argv[2] || "test@example.com";
const uid = process.argv[3] || "J1hWZLpgNxb33ddcQ3aixEFKQhQQ";

ensureUserDocument(email, uid)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to ensure user document:", error);
    process.exit(1);
  });
