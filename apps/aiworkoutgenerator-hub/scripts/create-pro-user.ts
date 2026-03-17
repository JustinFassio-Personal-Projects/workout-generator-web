#!/usr/bin/env tsx
/**
 * Script to create a test user with Pro subscription in Firebase Emulator
 *
 * Usage:
 *   tsx scripts/create-pro-user.ts [email] [password]
 *
 * Example:
 *   tsx scripts/create-pro-user.ts pro@test.com password123
 *
 * This script:
 * 1. Creates a user in Auth emulator
 * 2. Sets custom claims for Pro subscription
 * 3. Creates user document in Firestore with subscription info
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

async function createProUser(email: string, password: string) {
  try {
    initializeAdmin();

    console.log("Creating user with email:", email);

    // 1. Create user in Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true,
    });

    console.log("✅ User created:", userRecord.uid);

    // 2. Set custom claims for Pro subscription
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      subscription_tier: "pro",
      subscription_status: "active",
    });

    console.log(
      "✅ Custom claims set: subscription_tier=pro, subscription_status=active"
    );

    // 3. Create user document in Firestore
    const db = admin.firestore();
    await db.collection("users").doc(userRecord.uid).set(
      {
        email,
        subscription_tier: "pro",
        subscription_status: "active",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ Firestore user document created");

    console.log("\n🎉 Pro user created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("UID:", userRecord.uid);
    console.log("\nYou can now sign in at http://localhost:5178/login");

    return userRecord.uid;
  } catch (error) {
    console.error("❌ Error creating user:", error);
    throw error;
  }
}

// Main execution
// Use provided arguments or fall back to defaults for convenience
const email = process.argv[2] || "pro@test.com";
const password = process.argv[3] || "test123456";

createProUser(email, password)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to create user:", error);
    process.exit(1);
  });
