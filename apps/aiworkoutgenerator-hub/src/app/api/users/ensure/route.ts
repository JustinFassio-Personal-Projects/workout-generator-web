import { NextRequest, NextResponse } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { resolveIdToken } from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

/**
 * API route to ensure a user document exists in Firestore.
 * Uses Admin SDK to bypass security rules.
 * Called after user signs in to create/update their document.
 */
export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* empty */
  }
  try {
    const idToken = resolveIdToken(request, body);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }
    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const userRef = adminDb.collection("users").doc(userId);

    // Check if document exists
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Document exists - just update last_login
      await userRef.update({
        last_login: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, action: "updated" });
    }

    // Document doesn't exist - create it
    await userRef.set(
      {
        email: decodedToken.email || "",
        display_name:
          decodedToken.name || decodedToken.email?.split("@")[0] || "User",
        photo_url: decodedToken.picture || null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        last_login: FieldValue.serverTimestamp(),
        is_active: true,
        subscription_tier: "free",
        stripe_customer_id: null,
        preferences: {},
        onboarding_completed: false,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, action: "created" });
  } catch (error) {
    const authErrorCode =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? ((error as { code: string }).code as string)
        : undefined;
    const isAuthError =
      typeof authErrorCode === "string" && authErrorCode.startsWith("auth/");
    if (isAuthError) {
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    captureApiError(error, {
      endpoint: "users_ensure",
      operation: "ensure_user_document",
    });
    logger.error("Error ensuring user document", error, {
      route: "/api/users/ensure",
      operation: "ensure_user_document",
    });
    return NextResponse.json(
      { error: "Failed to ensure user document" },
      { status: 500 }
    );
  }
}
