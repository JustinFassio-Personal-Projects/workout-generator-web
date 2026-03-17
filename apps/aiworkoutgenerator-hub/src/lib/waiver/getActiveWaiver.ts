import { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "../firebase-admin";
import { calculateVersionHash } from "../api-utils";
import { DEFAULT_WAIVER_TEXT } from "./default-waiver-text";
import type { LiabilityWaiver } from "@/types/firestore";

/**
 * Get the currently active waiver version from Firestore.
 * If no active waiver exists, automatically creates one using DEFAULT_WAIVER_TEXT.
 *
 * This ensures the waiver system is self-healing and users are never blocked
 * due to missing waiver configuration.
 *
 * @returns The active waiver (existing or newly created)
 */
export async function getActiveWaiver(): Promise<LiabilityWaiver | null> {
  let activeWaiverDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  try {
    // Try query with orderBy (requires index)
    const activeWaiverQuery = await adminDb
      .collection("liability_waivers")
      .where("is_active", "==", true)
      .orderBy("effective_date", "desc")
      .limit(1)
      .get();

    if (!activeWaiverQuery.empty) {
      activeWaiverDoc = activeWaiverQuery.docs[0];
    }
  } catch (error) {
    // Fallback: Query without orderBy if index doesn't exist yet
    console.warn("Waiver query index may not exist, using fallback:", error);
    const allActiveWaivers = await adminDb
      .collection("liability_waivers")
      .where("is_active", "==", true)
      .get();

    if (!allActiveWaivers.empty) {
      // Sort in memory by effective_date (descending) and take the first
      const sortedWaivers = allActiveWaivers.docs
        .map((doc) => ({
          doc,
          data: doc.data(),
          effectiveDate: doc.data().effective_date,
        }))
        .sort((a, b) => {
          const aDate = a.effectiveDate;
          const bDate = b.effectiveDate;
          const aMillis =
            aDate?.toMillis?.() || (aDate?.seconds || 0) * 1000 || 0;
          const bMillis =
            bDate?.toMillis?.() || (bDate?.seconds || 0) * 1000 || 0;
          return bMillis - aMillis; // Descending
        });

      if (sortedWaivers.length > 0) {
        activeWaiverDoc = sortedWaivers[0].doc;
      }
    }
  }

  // If no active waiver exists, create the default one
  if (!activeWaiverDoc) {
    console.log(
      "[WAIVER] No active waiver found. Creating default waiver v1.0.0..."
    );

    try {
      const now = Timestamp.now();
      const versionHash = calculateVersionHash(DEFAULT_WAIVER_TEXT);

      const waiverRef = adminDb.collection("liability_waivers").doc();
      const waiverData = {
        version: "1.0.0",
        version_hash: versionHash,
        title: "Liability Waiver and Terms of Service",
        content: DEFAULT_WAIVER_TEXT,
        is_active: true,
        effective_date: now,
        created_at: now,
        updated_at: now,
        created_by: "system-auto",
      };

      await waiverRef.set(waiverData);

      console.log(
        `[WAIVER] Created default waiver v1.0.0 (ID: ${waiverRef.id})`
      );

      return {
        id: waiverRef.id,
        ...waiverData,
      } as LiabilityWaiver;
    } catch (createError) {
      console.error("[WAIVER] Failed to create default waiver:", createError);
      return null;
    }
  }

  // Ensure id is not duplicated (waiverData may already have id from data())
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _unused, ...waiverData } = activeWaiverDoc.data();
  return {
    id: activeWaiverDoc.id,
    ...waiverData,
  } as LiabilityWaiver;
}
