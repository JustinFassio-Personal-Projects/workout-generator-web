import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/api-utils";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  getPreferenceDocId,
  trimExerciseName,
} from "@/lib/image-generation-config";
import type { UserExerciseImagePreference } from "@/types/firestore";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const COLLECTION_NAME = "user_exercise_image_preferences";

/**
 * GET /api/images/preferences
 *
 * Get user's image preference for an exercise.
 *
 * Query parameters:
 * - exerciseName: The exercise name to look up (required)
 *
 * Authentication: Required
 */
export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Verify authentication
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get exercise name from query parameters
    const { searchParams } = new URL(request.url);
    const exerciseName = searchParams.get("exerciseName");

    if (!exerciseName || exerciseName.trim().length === 0) {
      return NextResponse.json(
        { error: "exerciseName query parameter is required" },
        { status: 400 }
      );
    }

    // Get preference document
    const docId = getPreferenceDocId(userId, exerciseName);
    const preferenceRef = adminDb.collection(COLLECTION_NAME).doc(docId);
    const snapshot = await preferenceRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ preference: null });
    }

    // Include document ID in response to match UserExerciseImagePreference interface
    const data = snapshot.data();
    const preference: UserExerciseImagePreference = {
      ...data,
      id: snapshot.id,
    } as UserExerciseImagePreference;
    return NextResponse.json({ preference });
  } catch (error) {
    captureApiError(error, {
      endpoint: "images_preferences",
      operation: "get_preference",
    });
    logger.error("[Image Preferences API] Error fetching preference", error, {
      route: "/api/images/preferences",
      operation: "get_preference",
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Failed to fetch preference",
        ...(isDevelopment && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/images/preferences
 *
 * Save user's image preference for an exercise.
 *
 * Body:
 * - exerciseName: string (required)
 * - imageUrl: string (required)
 * - imageId: string (required)
 *
 * Authentication: Required
 */
export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Verify authentication
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const { exerciseName, imageId } = body;
    // Note: imageUrl is accepted from client for backward compatibility but ignored.
    // We verify imageId and use the canonical image_url from master_exercise_images.

    if (!exerciseName || typeof exerciseName !== "string") {
      return NextResponse.json(
        { error: "exerciseName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!imageId || typeof imageId !== "string") {
      return NextResponse.json(
        { error: "imageId is required and must be a string" },
        { status: 400 }
      );
    }

    // SECURITY: Verify imageId exists in master_exercise_images and is certified
    // Use the stored image_url from the database, not the client-provided value
    const masterImageRef = adminDb
      .collection("master_exercise_images")
      .doc(imageId);
    const masterImageDoc = await masterImageRef.get();

    if (!masterImageDoc.exists) {
      return NextResponse.json(
        { error: "Image not found in master_exercise_images" },
        { status: 404 }
      );
    }

    const masterImageData = masterImageDoc.data();
    if (masterImageData?.status !== "certified") {
      return NextResponse.json(
        {
          error:
            "Image is not certified. Only certified images can be selected.",
        },
        { status: 403 }
      );
    }

    // Use the canonical image_url from the database, not the client-provided value
    const verifiedImageUrl = masterImageData.image_url;
    if (!verifiedImageUrl || typeof verifiedImageUrl !== "string") {
      return NextResponse.json(
        { error: "Image document is missing image_url" },
        { status: 500 }
      );
    }

    // Get or create preference document
    const docId = getPreferenceDocId(userId, exerciseName);
    const preferenceRef = adminDb.collection(COLLECTION_NAME).doc(docId);
    const normalizedName = trimExerciseName(exerciseName);

    // Check if document exists to preserve created_at
    const existingDoc = await preferenceRef.get();
    const now = FieldValue.serverTimestamp();

    if (existingDoc.exists) {
      // Update existing document
      await preferenceRef.update({
        selectedImageUrl: verifiedImageUrl, // Use verified URL from database
        selectedImageId: imageId,
        updated_at: now,
      });
    } else {
      // Create new document
      await preferenceRef.set({
        userId,
        exerciseName: normalizedName,
        selectedImageUrl: verifiedImageUrl, // Use verified URL from database
        selectedImageId: imageId,
        created_at: now,
        updated_at: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error, {
      endpoint: "images_preferences",
      operation: "save_preference",
    });
    logger.error("[Image Preferences API] Error saving preference", error, {
      route: "/api/images/preferences",
      operation: "save_preference",
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Failed to save preference",
        ...(isDevelopment && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/preferences
 *
 * Clear user's image preference for an exercise.
 *
 * Query parameters:
 * - exerciseName: The exercise name (required)
 *
 * Authentication: Required
 */
export async function DELETE(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // Verify authentication
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const decodedToken = await verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get exercise name from query parameters
    const { searchParams } = new URL(request.url);
    const exerciseName = searchParams.get("exerciseName");

    if (!exerciseName || exerciseName.trim().length === 0) {
      return NextResponse.json(
        { error: "exerciseName query parameter is required" },
        { status: 400 }
      );
    }

    // Delete preference document
    const docId = getPreferenceDocId(userId, exerciseName);
    const preferenceRef = adminDb.collection(COLLECTION_NAME).doc(docId);
    await preferenceRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    captureApiError(error, {
      endpoint: "images_preferences",
      operation: "delete_preference",
    });
    logger.error("[Image Preferences API] Error deleting preference", error, {
      route: "/api/images/preferences",
      operation: "delete_preference",
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Failed to delete preference",
        ...(isDevelopment && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}
