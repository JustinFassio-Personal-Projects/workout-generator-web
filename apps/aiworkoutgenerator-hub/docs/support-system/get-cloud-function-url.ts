#!/usr/bin/env tsx
/**
 * Utility script to get the Cloud Function URL for createSupportTicketFromWebsite
 *
 * NOTE: This is a reference utility. In production, the URL is configured via
 * Firebase App Hosting secrets. See SETUP.md for the actual working solution.
 *
 * Usage:
 *   tsx docs/support-system/get-cloud-function-url.ts
 *
 * This will output the URL that should be set as FIREBASE_CLOUD_FUNCTION_URL
 *
 * Production URL (confirmed working):
 *   https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app
 */

import { execSync } from "child_process";

const FUNCTION_NAME = "createSupportTicketFromWebsite";
const REGION = "us-central1";
const PROJECT_ID = "ai-workout-generator-hub";

console.log(`\n🔍 Getting Cloud Function URL for: ${FUNCTION_NAME}\n`);

try {
  // Try using gcloud CLI first (most reliable)
  console.log("Attempting to get URL via gcloud CLI...");
  try {
    const gcloudUrl = execSync(
      `gcloud functions describe ${FUNCTION_NAME} --region=${REGION} --gen2 --format="value(serviceConfig.uri)" --project=${PROJECT_ID}`,
      { encoding: "utf-8", stdio: "pipe" }
    ).trim();

    if (gcloudUrl && gcloudUrl.startsWith("https://")) {
      console.log(`✅ Found URL via gcloud:\n   ${gcloudUrl}\n`);
      console.log(
        `📋 Set this in your production environment:\n   FIREBASE_CLOUD_FUNCTION_URL=${gcloudUrl}\n`
      );
      process.exit(0);
    }
  } catch {
    console.log("⚠️  gcloud CLI not available or not authenticated");
  }

  // Fallback: Construct URL based on known format
  console.log("\n📝 Constructing URL from known format...");
  const constructedUrl = `https://${FUNCTION_NAME.toLowerCase()}-vp5ysk365a-uc.a.run.app`;
  console.log(`\n✅ Based on documentation, use:\n   ${constructedUrl}\n`);
  console.log(
    `📋 Set this in your production environment:\n   FIREBASE_CLOUD_FUNCTION_URL=${constructedUrl}\n`
  );
  console.log("⚠️  Note: Verify this URL is correct by checking:");
  console.log(
    "   1. Firebase Console > Functions > createSupportTicketFromWebsite"
  );
  console.log("   2. Or run: firebase functions:list and check the URL\n");
} catch (error) {
  console.error("❌ Error getting function URL:", error);
  console.log("\n📋 Manual steps:");
  console.log("   1. Go to Firebase Console > Functions");
  console.log("   2. Click on createSupportTicketFromWebsite");
  console.log("   3. Copy the URL from the Configuration tab");
  console.log(
    "   4. Set FIREBASE_CLOUD_FUNCTION_URL in your production environment\n"
  );
  process.exit(1);
}
