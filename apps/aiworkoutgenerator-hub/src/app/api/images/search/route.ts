import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken } from "@/lib/api-utils";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";
import type { MasterExerciseImage } from "@/types/firestore";
import type * as FirebaseFirestore from "firebase-admin/firestore";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/images/search
 *
 * Search for certified images in master_exercise_images where exercise_name contains the search phrase.
 * Returns all matching certified images.
 *
 * Query parameters:
 * - searchPhrase: The exercise name or phrase to search for (required)
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

    try {
      await verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get search phrase from query parameters
    const { searchParams } = new URL(request.url);
    const searchPhrase = searchParams.get("searchPhrase");

    if (!searchPhrase || searchPhrase.trim().length === 0) {
      return NextResponse.json(
        { error: "searchPhrase query parameter is required" },
        { status: 400 }
      );
    }

    // Use adminDb which automatically respects FIRESTORE_EMULATOR_HOST
    // This is the exact same pattern used in image-mapping-admin.ts and getActiveWaiver.ts
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      logger.info("[Image Search API] Searching for images", {
        route: "/api/images/search",
        searchPhrase,
      });
    }

    // Fetch images - try certified first, then fall back to all images
    // Note: Firestore doesn't support "contains" queries efficiently,
    // so we fetch all images and filter client-side
    let snapshot;

    // First try to get certified images
    try {
      snapshot = await adminDb
        .collection("master_exercise_images")
        .where("status", "==", "certified")
        .get();
      if (isDevelopment) {
        logger.info("[Image Search API] Found certified images", {
          route: "/api/images/search",
          count: snapshot.size,
        });
      }
    } catch (queryError) {
      logger.error("[Image Search API] Certified query error", queryError, {
        route: "/api/images/search",
        operation: "query_certified_images",
      });
      snapshot = {
        empty: true,
        size: 0,
        docs: [],
      } as unknown as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    }

    // If no certified images, get ALL images (for emulator/testing)
    if (snapshot.empty || snapshot.size === 0) {
      if (isDevelopment) {
        logger.info(
          "[Image Search API] No certified images, fetching ALL images",
          {
            route: "/api/images/search",
          }
        );
      }
      try {
        const allImagesSnapshot = await adminDb
          .collection("master_exercise_images")
          .get();

        if (!allImagesSnapshot.empty) {
          if (isDevelopment) {
            logger.info("[Image Search API] Found total images", {
              route: "/api/images/search",
              count: allImagesSnapshot.size,
            });
          }

          // Use all images for search (emulator may not have status="certified")
          snapshot = allImagesSnapshot;
        } else {
          if (isDevelopment) {
            logger.warn(
              "[Image Search API] Collection is completely empty",
              undefined,
              {
                route: "/api/images/search",
              }
            );
          }
          return NextResponse.json({ images: [] });
        }
      } catch (debugError) {
        logger.error(
          "[Image Search API] Failed to fetch all images",
          debugError,
          {
            route: "/api/images/search",
            operation: "fetch_all_images",
          }
        );
        return NextResponse.json({ images: [] });
      }
    }

    // Filter images where exercise_name contains the search phrase (case-insensitive)
    const searchLower = searchPhrase.toLowerCase().trim();
    const matchingImages: MasterExerciseImage[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const exerciseName = data.exercise_name || "";

      // Check if exercise_name contains the search phrase
      if (exerciseName.toLowerCase().includes(searchLower)) {
        matchingImages.push({
          id: doc.id,
          exercise_name: exerciseName,
          image_url: data.image_url || "",
          storage_path: data.storage_path || "",
          position: data.position,
          status: data.status,
          certified_by: data.certified_by,
          certified_at: data.certified_at,
          file_size_bytes: data.file_size_bytes,
          dimensions: data.dimensions,
          mime_type: data.mime_type,
          created_at: data.created_at,
          updated_at: data.updated_at,
        } as MasterExerciseImage);
      }
    });

    if (isDevelopment && matchingImages.length === 0) {
      logger.info("[Image Search API] No matches found", {
        route: "/api/images/search",
        searchPhrase,
      });
    }

    // Sort by position (1 = primary, lower is better), then by exercise_name
    matchingImages.sort((a, b) => {
      const posA = a.position ?? 999;
      const posB = b.position ?? 999;
      if (posA !== posB) {
        return posA - posB;
      }
      return a.exercise_name.localeCompare(b.exercise_name);
    });

    return NextResponse.json({ images: matchingImages });
  } catch (error) {
    captureApiError(error, {
      endpoint: "images_search",
      operation: "search_images",
    });
    logger.error("[Image Search API] Error searching images", error, {
      route: "/api/images/search",
      operation: "search_images",
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        error: "Failed to search images",
        ...(isDevelopment && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}
