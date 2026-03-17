/**
 * Script to check workout_summaries collection for malformed user_id fields
 * Run with: npx tsx scripts/check-workout-summaries-userid.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  let serviceAccount = null;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Use default credentials (for local development with gcloud auth)
    initializeApp();
  }
}

const db = getFirestore();

async function checkWorkoutSummaries() {
  console.log(
    "Checking workout_summaries collection for malformed user_id fields...\n"
  );

  try {
    const summariesRef = db.collection("workout_summaries");
    const snapshot = await summariesRef.limit(100).get();

    if (snapshot.empty) {
      console.log("No documents found in workout_summaries collection.");
      return;
    }

    console.log(`Found ${snapshot.size} documents (showing first 100)\n`);

    const issues: Array<{
      id: string;
      issue: string;
      user_id: unknown;
    }> = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const user_id = data.user_id;

      // Check for various malformed user_id cases
      if (user_id === undefined) {
        issues.push({
          id: doc.id,
          issue: "user_id field is missing (undefined)",
          user_id: user_id,
        });
      } else if (user_id === null) {
        issues.push({
          id: doc.id,
          issue: "user_id field is null",
          user_id: user_id,
        });
      } else if (typeof user_id !== "string") {
        issues.push({
          id: doc.id,
          issue: `user_id is not a string (type: ${typeof user_id})`,
          user_id: user_id,
        });
      } else if (user_id.trim() === "") {
        issues.push({
          id: doc.id,
          issue: "user_id is an empty string",
          user_id: user_id,
        });
      }
    });

    if (issues.length === 0) {
      console.log(
        "✅ No malformed user_id fields found in the checked documents!"
      );
      console.log("All user_id fields are valid strings with content.");
    } else {
      console.log(
        `❌ Found ${issues.length} documents with malformed user_id fields:\n`
      );
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. Document ID: ${issue.id}`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   user_id value: ${JSON.stringify(issue.user_id)}`);
        console.log("");
      });
    }

    // Show sample of valid documents
    const validDocs = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const user_id = data.user_id;
      return (
        user_id !== undefined &&
        user_id !== null &&
        typeof user_id === "string" &&
        user_id.trim().length > 0
      );
    });

    if (validDocs.length > 0) {
      console.log(
        `\n✅ Found ${validDocs.length} documents with valid user_id fields.`
      );
      console.log("\nSample of valid documents:");
      validDocs.slice(0, 3).forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${doc.id}: user_id = "${data.user_id}"`);
      });
    }
  } catch (error) {
    console.error("Error checking workout_summaries:", error);
    throw error;
  }
}

checkWorkoutSummaries()
  .then(() => {
    console.log("\n✅ Check complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
