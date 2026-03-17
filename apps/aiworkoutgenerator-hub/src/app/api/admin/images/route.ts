import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { normalizeExerciseName } from "@/lib/image-generation-config";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import { FieldValue } from "firebase-admin/firestore";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schemas
// ============================================

const MarkMasterSchema = z.object({
  exerciseName: z.string().min(1),
  imageUrl: z.string().url(),
  storagePath: z.string().min(1),
  promptUsed: z.string().optional(),
});

const UpdateQualitySchema = z.object({
  exerciseName: z.string().min(1),
  qualityScore: z.number().min(1).max(5),
});

const DeleteImageSchema = z.object({
  exerciseName: z.string().min(1),
});

// ============================================
// Helper Functions
// ============================================

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Check if the user has admin role.
 */
async function isAdmin(uid: string): Promise<boolean> {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  return userDoc.exists && userDoc.data()?.role === "admin";
}

// ============================================
// POST Handler - Mark as Master Image
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      captureApiError(error, {
        endpoint: "admin_images",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/images",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Check admin role
    if (!(await isAdmin(uid))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = MarkMasterSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { exerciseName, imageUrl, storagePath, promptUsed } =
      parseResult.data;
    const normalizedName = normalizeExerciseName(exerciseName);

    // 4. Save to master_exercise_images collection
    const docRef = adminDb
      .collection("master_exercise_images")
      .doc(normalizedName);

    await docRef.set({
      exercise_name: exerciseName,
      image_url: imageUrl,
      storage_path: storagePath,
      prompt_used: promptUsed || "",
      quality_score: null,
      marked_master_at: FieldValue.serverTimestamp(),
      marked_by: uid,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: normalizedName,
      exerciseName,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_images",
      operation: "mark_master_image",
    });
    logger.error("Error marking master image", error, {
      route: "/api/admin/images",
      operation: "mark_master_image",
    });
    return NextResponse.json(
      {
        error: "Failed to mark master image",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH Handler - Update Quality Score
// ============================================

export async function PATCH(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      captureApiError(error, {
        endpoint: "admin_images",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/images",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Check admin role
    if (!(await isAdmin(uid))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateQualitySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { exerciseName, qualityScore } = parseResult.data;
    const normalizedName = normalizeExerciseName(exerciseName);

    // 4. Update the document
    const docRef = adminDb
      .collection("master_exercise_images")
      .doc(normalizedName);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Master image not found" },
        { status: 404 }
      );
    }

    await docRef.update({
      quality_score: qualityScore,
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      exerciseName,
      qualityScore,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_images",
      operation: "update_quality_score",
    });
    logger.error("Error updating quality score", error, {
      route: "/api/admin/images",
      operation: "update_quality_score",
    });
    return NextResponse.json(
      {
        error: "Failed to update quality score",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE Handler - Delete Master Image
// ============================================

export async function DELETE(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      captureApiError(error, {
        endpoint: "admin_images",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/images",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Check admin role
    if (!(await isAdmin(uid))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = DeleteImageSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { exerciseName } = parseResult.data;
    const normalizedName = normalizeExerciseName(exerciseName);

    // 4. Get the document to find storage path
    const docRef = adminDb
      .collection("master_exercise_images")
      .doc(normalizedName);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Master image not found" },
        { status: 404 }
      );
    }

    const storagePath = doc.data()?.storage_path;

    // 5. Delete from Firebase Storage
    if (storagePath) {
      const { getStorage } = await import("firebase-admin/storage");
      const bucket = getStorage().bucket();
      try {
        await bucket.file(storagePath).delete();
      } catch (error) {
        logger.warn("Failed to delete image from storage", error, {
          route: "/api/admin/images",
          operation: "delete_storage",
          storagePath,
        });
        // Continue with document deletion even if storage fails
      }
    }

    // 6. Delete the Firestore document
    await docRef.delete();

    return NextResponse.json({
      success: true,
      exerciseName,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_images",
      operation: "delete_master_image",
    });
    logger.error("Error deleting master image", error, {
      route: "/api/admin/images",
      operation: "delete_master_image",
    });
    return NextResponse.json(
      {
        error: "Failed to delete master image",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
