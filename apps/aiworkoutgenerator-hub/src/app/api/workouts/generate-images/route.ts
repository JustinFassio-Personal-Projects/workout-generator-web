import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { IMAGE_GENERATION_CONFIG } from "@/lib/image-generation-config";
import { extractBearerToken, getUserTier } from "@/lib/api-utils";
import { computeTrainerWorkoutQA } from "@/lib/quality/computeTrainerWorkoutQA";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";
import type { SubscriptionTier } from "@/lib/stripe";
import type { TrainerWorkout, TrainerWorkoutSection } from "@/types/firestore";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const RequestBodySchema = z.object({
  workoutId: z.string().min(1),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Get the user's subscription tier from custom claims.
 */

/**
 * Get the image generation limit for a subscription tier.
 */
function getImageLimit(tier: SubscriptionTier): number {
  const limits = IMAGE_GENERATION_CONFIG.tierLimits;
  switch (tier) {
    case "elite":
      return limits.elite;
    case "pro":
      return limits.pro;
    default:
      return limits.free;
  }
}

/**
 * Count workouts with images generated this billing period.
 */
async function getWorkoutsWithImagesCount(uid: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const snapshot = await adminDb
    .collection("trainer_workouts")
    .where("user_id", "==", uid)
    .where("has_images", "==", true)
    .where("images_generated_at", ">=", Timestamp.fromDate(startOfMonth))
    .count()
    .get();

  return snapshot.data()?.count ?? 0;
}

/**
 * Check if user can generate images based on their subscription tier.
 */
async function checkImageLimit(uid: string): Promise<{
  allowed: boolean;
  tier: SubscriptionTier;
  limit: number;
  used: number;
  remaining: number;
}> {
  const tier = await getUserTier(uid);
  const limit = getImageLimit(tier);

  // No images for free/starter tier
  if (limit === 0) {
    return {
      allowed: false,
      tier,
      limit,
      used: 0,
      remaining: 0,
    };
  }

  const used = await getWorkoutsWithImagesCount(uid);
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    tier,
    limit,
    used,
    remaining,
  };
}

// ============================================
// POST Handler - Generate Images for Workout
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
      logger.error("Token verification failed", error, {
        route: "/api/workouts/generate-images",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Per-user rate limit
    const rateLimit = await checkApiRateLimit(uid, "generate_images");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retry_after: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter ?? 60),
          },
        }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = RequestBodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { workoutId } = parseResult.data;

    // 3. Check subscription tier and image limit
    const imageLimit = await checkImageLimit(uid);

    if (!imageLimit.allowed) {
      if (imageLimit.limit === 0) {
        return NextResponse.json(
          {
            error: "Image generation not available",
            tier: imageLimit.tier,
            message:
              "Image generation is only available for Pro and Elite subscribers.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Monthly image limit reached",
          tier: imageLimit.tier,
          limit: imageLimit.limit,
          used: imageLimit.used,
          remaining: imageLimit.remaining,
          message: `You've used all ${imageLimit.limit} workouts with images this month. Upgrade to Elite for more.`,
        },
        { status: 429 }
      );
    }

    // 4. Fetch the workout
    const workoutDoc = await adminDb
      .collection("trainer_workouts")
      .doc(workoutId)
      .get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = {
      id: workoutDoc.id,
      ...workoutDoc.data(),
    } as TrainerWorkout;

    if (workout.user_id !== uid) {
      return NextResponse.json(
        { error: "Unauthorized access to workout" },
        { status: 403 }
      );
    }

    // Check if images already generated
    if (workout.has_images) {
      return NextResponse.json(
        { error: "Images already generated for this workout" },
        { status: 400 }
      );
    }

    // 5. Generate images for all exercises
    // This is a placeholder - actual image generation happens via the
    // client-side service calling /api/image/generate for each exercise
    // to provide progress updates. Here we just validate and return approval.

    return NextResponse.json({
      approved: true,
      workoutId,
      tier: imageLimit.tier,
      remaining: imageLimit.remaining - 1,
      message: "You can proceed with image generation.",
    });
  } catch (error) {
    logger.error("Image generation check error", error, {
      route: "/api/workouts/generate-images",
      operation: "check_image_generation_eligibility",
    });

    return NextResponse.json(
      {
        error: "Failed to check image generation eligibility",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH Handler - Mark Images as Generated
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
      logger.error("Token verification failed", error, {
        route: "/api/workouts/generate-images",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const patchRateLimit = await checkApiRateLimit(uid, "generate_images");
    if (!patchRateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retry_after: patchRateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(patchRateLimit.retryAfter ?? 60),
          },
        }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { workoutId, sections, imagesGenerated, imagesMasterReused } = body;

    if (!workoutId || !sections) {
      return NextResponse.json(
        { error: "Missing workoutId or sections" },
        { status: 400 }
      );
    }

    // 3. Verify workout ownership
    const workoutRef = adminDb.collection("trainer_workouts").doc(workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const existingData = workoutDoc.data();
    if (existingData?.user_id !== uid) {
      return NextResponse.json(
        { error: "Unauthorized access to workout" },
        { status: 403 }
      );
    }

    // 4. Merge only image-related fields from client sections into existing sections
    // This prevents clients from corrupting workout structure through this endpoint
    const existingSections = existingData?.sections || [];
    const mergedSections = existingSections.map(
      (existingSection: Record<string, unknown>, sectionIdx: number) => {
        const clientSection = sections[sectionIdx];
        if (!clientSection || !Array.isArray(clientSection.exercises)) {
          return existingSection;
        }

        const existingExercises = Array.isArray(existingSection.exercises)
          ? existingSection.exercises
          : [];

        const mergedExercises = existingExercises.map(
          (existingExercise: Record<string, unknown>, exerciseIdx: number) => {
            const clientExercise = clientSection.exercises[exerciseIdx];
            if (!clientExercise) {
              return existingExercise;
            }

            // Only copy image-related fields from client data
            return {
              ...existingExercise,
              ...(clientExercise.image_url !== undefined && {
                image_url: clientExercise.image_url,
              }),
              ...(clientExercise.image_source !== undefined && {
                image_source: clientExercise.image_source,
              }),
              ...(clientExercise.image_generated_at !== undefined && {
                image_generated_at: clientExercise.image_generated_at,
              }),
            };
          }
        );

        return {
          ...existingSection,
          exercises: mergedExercises,
        };
      }
    );

    // 5. Recompute Quality Assurance with updated image data
    const imageCompletedAt = Timestamp.now();
    const existingQA = existingData?.quality_assurance;

    // Extract existing workout data for QA computation
    const qaInput = {
      title: existingData?.title as string | undefined,
      description: existingData?.description as string | undefined,
      focus: existingData?.focus as string | undefined,
      difficulty: existingData?.difficulty as
        | "beginner"
        | "intermediate"
        | "advanced"
        | undefined,
      duration_minutes: existingData?.duration_minutes as number | undefined,
      totalDuration: existingData?.totalDuration as number | undefined,
      sections: mergedSections as TrainerWorkoutSection[],
      generation_context: existingData?.generation_context,
      user_equipment:
        existingData?.generation_context?.profile_snapshot
          ?.available_equipment ?? [],
      has_images: true,
      images_generated_at: imageCompletedAt,
      // Preserve existing generation timing
      generation_started_at: existingQA?.generation?.started_at ?? null,
      generation_completed_at: existingQA?.generation?.completed_at ?? null,
      generation_duration_ms: existingQA?.generation?.duration_ms ?? null,
      // Set image generation timing
      image_generation_started_at:
        existingQA?.image_generation?.started_at ?? null,
      image_generation_completed_at: imageCompletedAt,
    };

    const updatedQA = computeTrainerWorkoutQA(qaInput, imageCompletedAt);

    // Log QA results for observability
    logger.info("[QA] Workout images updated", {
      route: "/api/workouts/generate-images",
      workoutId,
      overallScore: updatedQA.overall_score,
      criticalAlerts: updatedQA.alerts.critical_count,
      warningAlerts: updatedQA.alerts.warning_count,
      imagesComplete: updatedQA.image_generation.total_complete,
      imagesTotal: updatedQA.image_generation.total_requested,
    });

    // 6. Update the workout with merged sections and updated QA
    await workoutRef.update({
      sections: mergedSections,
      has_images: true,
      images_generated_at: FieldValue.serverTimestamp(),
      quality_assurance: updatedQA,
      updated_at: FieldValue.serverTimestamp(),
    });

    // 7. Return success
    return NextResponse.json({
      success: true,
      workoutId,
      imagesGenerated,
      imagesMasterReused,
      qualityScore: updatedQA.overall_score,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "generate_images",
      operation: "update_workout_images",
    });
    incrementMetric("ai.failure", 1, { endpoint: "generate_images" });
    logger.error("Error updating workout images", error, {
      route: "/api/workouts/generate-images",
      operation: "update_workout_images",
    });

    return NextResponse.json(
      {
        error: "Failed to update workout images",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
