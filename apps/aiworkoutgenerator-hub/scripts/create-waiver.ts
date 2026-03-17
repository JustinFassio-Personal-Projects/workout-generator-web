/**
 * Consolidated script to create/seed the initial active liability waiver.
 * Works with both Firebase Emulator and production Firebase.
 *
 * Usage:
 *   # Production (uses default Firebase Admin SDK initialization)
 *   npx tsx scripts/create-waiver.ts
 *
 *   # Emulator (automatically detected if FIRESTORE_EMULATOR_HOST is set)
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/create-waiver.ts
 *
 *   # Force creation even if active waiver exists
 *   npx tsx scripts/create-waiver.ts --force
 *
 *   # Activate existing version 1.0.0 if it exists (only if no active waiver exists)
 *   npx tsx scripts/create-waiver.ts --activate-existing
 */

import { adminDb } from "../src/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { DEFAULT_WAIVER_TEXT } from "../src/lib/waiver/default-waiver-text";
import { calculateVersionHash } from "../src/lib/api-utils";

const FORCE = process.argv.includes("--force");
const ACTIVATE_EXISTING = process.argv.includes("--activate-existing");

async function createWaiver() {
  try {
    const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
    const env = isEmulator ? "EMULATOR" : "PRODUCTION";
    console.log(`\n[${env}] Creating/checking initial active waiver...\n`);

    // Check if there's already an active waiver
    const existingActive = await adminDb
      .collection("liability_waivers")
      .where("is_active", "==", true)
      .limit(1)
      .get();

    if (!existingActive.empty && !FORCE) {
      const existing = existingActive.docs[0].data();
      const existingVersion = existing.version as string;
      console.log(
        `✓ Active waiver already exists: ${existingVersion} (ID: ${existingActive.docs[0].id})`
      );

      // If --activate-existing is used but an active waiver exists, prevent downgrade
      if (ACTIVATE_EXISTING) {
        if (existingVersion === "1.0.0") {
          console.log("Version 1.0.0 is already active. No action needed.");
          return;
        } else {
          console.error(
            `\n✗ Cannot activate version 1.0.0: Active waiver version ${existingVersion} exists.`
          );
          console.error(
            "  --activate-existing only activates 1.0.0 when no active waiver exists."
          );
          console.error(
            "  To force activation (downgrading from a newer version), use --force instead."
          );
          throw new Error(
            `Cannot downgrade from active version ${existingVersion} to 1.0.0`
          );
        }
      }

      console.log("No action needed. Use --force to create anyway.");
      return;
    }

    // Check if version 1.0.0 already exists (even if inactive)
    const existingVersion = await adminDb
      .collection("liability_waivers")
      .where("version", "==", "1.0.0")
      .limit(1)
      .get();

    if (!existingVersion.empty) {
      if (ACTIVATE_EXISTING || FORCE) {
        console.log("Version 1.0.0 exists. Activating it...");

        // Deactivate any other active waivers first
        const allActive = await adminDb
          .collection("liability_waivers")
          .where("is_active", "==", true)
          .get();

        if (!allActive.empty) {
          const batch = adminDb.batch();
          allActive.docs.forEach((doc) => {
            batch.update(doc.ref, {
              is_active: false,
              updated_at: Timestamp.now(),
            });
          });
          await batch.commit();
          console.log(
            `  Deactivated ${allActive.size} existing active waiver(s)`
          );
        }

        const docRef = existingVersion.docs[0].ref;
        const now = Timestamp.now();
        await docRef.update({
          is_active: true,
          effective_date: now,
          updated_at: now,
        });
        console.log("✓ Activated existing waiver version 1.0.0");
        console.log(`  - ID: ${docRef.id}`);
        console.log(`  - Effective Date: ${now.toDate().toISOString()}`);
        return;
      } else {
        console.log("Version 1.0.0 exists but is inactive.");
        console.log(
          "Use --activate-existing to activate it, or --force to create new."
        );
        return;
      }
    }

    console.log("Creating initial active waiver...");

    // Deactivate any other waivers (safety check)
    const allWaivers = await adminDb
      .collection("liability_waivers")
      .where("is_active", "==", true)
      .get();

    if (!allWaivers.empty) {
      console.log(
        `  Deactivating ${allWaivers.size} existing active waiver(s)...`
      );
      const batch = adminDb.batch();
      allWaivers.docs.forEach((doc) => {
        batch.update(doc.ref, {
          is_active: false,
          updated_at: Timestamp.now(),
        });
      });
      await batch.commit();
    }

    // Calculate version hash
    const versionHash = calculateVersionHash(DEFAULT_WAIVER_TEXT);

    // Create new waiver
    const waiverRef = adminDb.collection("liability_waivers").doc();
    const now = Timestamp.now();

    const waiver = {
      version: "1.0.0",
      version_hash: versionHash,
      title: "Liability Waiver and Terms of Service",
      content: DEFAULT_WAIVER_TEXT,
      is_active: true,
      effective_date: now,
      created_at: now,
      updated_at: now,
      created_by: "system", // System-created initial waiver
    };

    await waiverRef.set(waiver);

    console.log("\n✓ Created initial active waiver:");
    console.log(`  - Version: ${waiver.version}`);
    console.log(`  - ID: ${waiverRef.id}`);
    console.log(`  - Effective Date: ${now.toDate().toISOString()}`);
    console.log(`  - Title: ${waiver.title}`);
    console.log(
      "\n✓ Waiver is now active and required for all workout generations"
    );
  } catch (error) {
    console.error("\n✗ Error creating waiver:", error);
    throw error;
  }
}

// Run the function
createWaiver()
  .then(() => {
    console.log("\n✓ Script completed successfully\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Fatal error:", error);
    process.exit(1);
  });
