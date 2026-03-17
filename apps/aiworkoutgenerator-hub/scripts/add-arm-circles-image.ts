/**
 * Script to add "Arm Circles" image to master_exercise_images collection.
 *
 * This script creates a Firestore document for an image that exists in Storage
 * but doesn't have a corresponding Firestore document yet.
 *
 * Usage: npx tsx scripts/add-arm-circles-image.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

// Initialize Firebase Admin for PRODUCTION
function initializeProductionAdmin(): admin.app.App {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required"
    );
  }

  const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;

  // Initialize without emulator settings
  const appName = "add-image-script";
  try {
    return admin.app(appName);
  } catch {
    return admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccount),
        projectId:
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
          serviceAccount.projectId,
      },
      appName
    );
  }
}

async function addArmCirclesImage() {
  const app = initializeProductionAdmin();
  const db = app.firestore();

  // Image details from Storage
  const exerciseName = "Arm Circles";
  const imageUrl =
    "https://storage.googleapis.com/ai-workout-generator-hub.firebasestorage.app/exercises/arm-circles/1768229682702-gosvt60.jpg";
  const storagePath = "exercises/arm-circles/1768229682702-gosvt60.jpg";

  // Create document in master_exercise_images
  // Using a random ID (collection uses random IDs, not normalized names)
  const docRef = db.collection("master_exercise_images").doc();

  const imageData = {
    exercise_name: exerciseName, // Exact name for querying
    image_url: imageUrl,
    storage_path: storagePath,
    status: "certified", // Required for images to show in workouts
    position: 1, // Primary image
    certified_by: "system", // System-added
    certified_at: admin.firestore.FieldValue.serverTimestamp(),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await docRef.set(imageData);
    console.log(
      `✅ Successfully added "${exerciseName}" image to master_exercise_images`
    );
    console.log(`   Document ID: ${docRef.id}`);
    console.log(`   Image URL: ${imageUrl}`);
    console.log("\nThe image should now display in workouts!");
  } catch (error) {
    console.error("❌ Error adding image:", error);
    process.exit(1);
  }
}

// Run the script
addArmCirclesImage()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
