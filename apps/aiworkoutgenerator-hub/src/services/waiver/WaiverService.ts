import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";

import { getDbInstance } from "@/lib/firestore";
import { getIdToken } from "@/lib/auth";
import { getAppCheckHeaders } from "@/lib/firebase";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type { LiabilityWaiver, UserWaiverAgreement } from "@/types/firestore";
import type {
  WaiverAgreementRequest,
  WaiverAgreementResponse,
} from "@/types/waiver";

export class WaiverService {
  /**
   * Get the currently active waiver version.
   * Calls the API route to fetch the active waiver.
   *
   * @returns The active waiver or null if none exists
   * @throws Error if authentication fails
   */
  static async getActiveWaiverVersion(): Promise<LiabilityWaiver | null> {
    // Force refresh to avoid 401 from expired token (e.g. after time on waiver page)
    const idToken = await getIdToken(true);
    if (!idToken) {
      throw new Error("You must be signed in to view the waiver");
    }

    const response = await fetch("/api/waiver/active", {
      headers: {
        Authorization: `Bearer ${idToken}`,
        ...(await getAppCheckHeaders()),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        const msg =
          body.error === "Invalid or expired token"
            ? "Session may have expired. Please sign out and sign in again."
            : "Authentication required";
        throw new Error(msg);
      }
      throw new Error("Failed to fetch active waiver");
    }

    const data = (await response.json()) as { waiver: LiabilityWaiver | null };
    return data.waiver;
  }

  /**
   * @deprecated Use getActiveWaiverVersion() instead
   * Kept for backward compatibility
   */
  static async getActiveWaiver(): Promise<LiabilityWaiver | null> {
    return this.getActiveWaiverVersion();
  }

  /**
   * Check if a user has agreed to the active waiver version.
   * Returns the agreement if found, null otherwise.
   */
  static async checkUserAgreement(
    userId: string
  ): Promise<UserWaiverAgreement | null> {
    // Ensure auth token is available before making query
    const token = await getIdToken();
    if (!token) {
      throw new Error("User must be authenticated to check agreement status");
    }

    const activeWaiver = await WaiverService.getActiveWaiver();
    if (!activeWaiver) {
      // No active waiver means no agreement required
      return null;
    }

    const db = getDbInstance();
    const agreementsRef = collection(db, "user_waiver_agreements");

    try {
      // Try query with orderBy (requires index)
      const q = query(
        agreementsRef,
        where("user_id", "==", userId),
        where("waiver_version", "==", activeWaiver.version),
        orderBy("created_at", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as UserWaiverAgreement;
    } catch (error) {
      // Fallback: Query without orderBy if index doesn't exist yet
      console.warn("Index may not exist, using fallback query:", error);
      const fallbackQuery = query(
        agreementsRef,
        where("user_id", "==", userId),
        where("waiver_version", "==", activeWaiver.version)
      );

      const snapshot = await getDocs(fallbackQuery);
      if (snapshot.empty) {
        return null;
      }

      // Sort in memory by created_at (descending) and take the first
      const agreements = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => {
          const aDate = (a as UserWaiverAgreement).created_at;
          const bDate = (b as UserWaiverAgreement).created_at;
          const aMillis = aDate?.toMillis?.() || aDate?.seconds * 1000 || 0;
          const bMillis = bDate?.toMillis?.() || bDate?.seconds * 1000 || 0;
          return bMillis - aMillis; // Descending
        });

      return agreements[0] as UserWaiverAgreement;
    }
  }

  /**
   * Check if user has agreed to the active waiver version.
   * Returns true if agreement exists, false otherwise.
   */
  static async hasUserAgreed(userId: string): Promise<boolean> {
    const agreement = await WaiverService.checkUserAgreement(userId);
    return agreement !== null;
  }

  /**
   * Create a waiver agreement for the current user.
   * Uses authenticatedFetch for token refresh on 401 and body token fallback
   * when App Hosting/proxies strip auth headers.
   *
   * @param request - Waiver agreement data (full name and checkboxes)
   * @returns Agreement response with agreement_id and waiver_version
   * @throws Error if validation fails or request is invalid
   */
  static async createWaiverAgreement(
    request: WaiverAgreementRequest
  ): Promise<WaiverAgreementResponse> {
    const response = await authenticatedFetch("/api/waiver/agree", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      forceTokenRefresh: true, // Force fresh token; user may have been on waiver page a long time
    });

    const data = (await response.json()) as WaiverAgreementResponse;

    if (!response.ok) {
      throw new Error(data.error || "Failed to save waiver agreement");
    }

    return data;
  }

  /**
   * @deprecated Use createWaiverAgreement() instead
   * Kept for backward compatibility
   */
  static async saveUserAgreement(
    request: WaiverAgreementRequest
  ): Promise<WaiverAgreementResponse> {
    return this.createWaiverAgreement(request);
  }

  /**
   * Get a user's agreement history.
   * Returns all agreements for the user, ordered by creation date (newest first).
   */
  static async getUserAgreementHistory(
    userId: string
  ): Promise<UserWaiverAgreement[]> {
    const db = getDbInstance();
    const agreementsRef = collection(db, "user_waiver_agreements");
    const q = query(
      agreementsRef,
      where("user_id", "==", userId),
      orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserWaiverAgreement[];
  }

  /**
   * Get a specific waiver version by version string.
   */
  static async getWaiverByVersion(
    version: string
  ): Promise<LiabilityWaiver | null> {
    const db = getDbInstance();
    const waiversRef = collection(db, "liability_waivers");
    const q = query(waiversRef, where("version", "==", version), limit(1));

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as LiabilityWaiver;
  }

  /**
   * Get a waiver by document ID.
   */
  static async getWaiverById(
    waiverId: string
  ): Promise<LiabilityWaiver | null> {
    const db = getDbInstance();
    const waiverRef = doc(db, "liability_waivers", waiverId);
    const snapshot = await getDoc(waiverRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as LiabilityWaiver;
  }
}
