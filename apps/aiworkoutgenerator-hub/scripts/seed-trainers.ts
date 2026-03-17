/**
 * Seed script to populate the Firestore `trainers` collection with all 6 AI trainer personas.
 *
 * Usage:
 *   npx tsx scripts/seed-trainers.ts
 *
 * Requirements:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY environment variable (JSON string)
 *   - OR GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable
 *   - Firestore access configured
 */

import { config } from "dotenv";
import { resolve } from "path";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { TRAINERS } from "../src/types/trainer";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

// Initialize Firebase Admin
function initializeAdmin(): admin.app.App {
  // Check if already initialized
  const appName = "seed-trainers";
  try {
    return admin.app(appName);
  } catch {
    // Not initialized yet
  }

  // Try FIREBASE_SERVICE_ACCOUNT_KEY first (JSON string)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
      return admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId:
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            serviceAccount.projectId ||
            "ai-workout-generator-hub",
        },
        appName
      );
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format");
    }
  }

  // Try GOOGLE_APPLICATION_CREDENTIALS_JSON (alternative name)
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJson) {
    try {
      const serviceAccount = JSON.parse(credentialsJson) as ServiceAccount;
      return admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId:
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
            serviceAccount.projectId ||
            "ai-workout-generator-hub",
        },
        appName
      );
    } catch (error) {
      console.error(
        "Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:",
        error
      );
      throw new Error("Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format");
    }
  }

  // Fall back to Application Default Credentials (for Cloud environments)
  // This will work if Firebase CLI is authenticated (firebase login)
  // or if gcloud auth application-default login was run
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ai-workout-generator-hub";

  try {
    // Try to use Application Default Credentials
    // This works when Firebase CLI is authenticated
    return admin.initializeApp(
      {
        projectId,
      },
      appName
    );
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    throw new Error(
      `Firebase Admin initialization failed. Options:
1. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable (JSON string)
2. Set GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable
3. Ensure Firebase CLI is authenticated: firebase login --reauth
4. Or set up Application Default Credentials: gcloud auth application-default login

Project ID: ${projectId}`
    );
  }
}

const app = initializeAdmin();
const db = app.firestore();

async function seedTrainers() {
  console.log("🏋️ Seeding trainers collection...\n");

  const trainersRef = db.collection("trainers");
  const batch = db.batch();

  for (const trainer of TRAINERS) {
    const docRef = trainersRef.doc(trainer.id);

    // Add Firestore timestamps
    const trainerData = {
      ...trainer,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    batch.set(docRef, trainerData, { merge: true });
    console.log(`  ✓ ${trainer.name} "${trainer.nickname}"`);
  }

  await batch.commit();

  console.log(`\n✅ Successfully seeded ${TRAINERS.length} trainers!`);
}

async function main() {
  try {
    await seedTrainers();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding trainers:", error);
    process.exit(1);
  }
}

main();
