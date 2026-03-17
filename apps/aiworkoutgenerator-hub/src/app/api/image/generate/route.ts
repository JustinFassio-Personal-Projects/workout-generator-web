import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { IMAGE_GENERATION_CONFIG } from "@/lib/image-generation-config";
import { getEnvAwareErrorMessage } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { checkApiRateLimit } from "@/lib/rate-limit";
import { requireAppCheck } from "@/lib/app-check";
import { captureApiError, incrementMetric } from "@/lib/sentry";

// Force dynamic rendering - prevents static analysis of firebase-admin at build time
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const RequestBodySchema = z.object({
  prompt: z.string().min(10).max(2000),
  negativePrompts: z.array(z.string()).optional(),
  exerciseName: z.string().min(1),
  workoutId: z.string().min(1),
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
 * Check if we're in development mode without Vertex AI configured.
 * Returns true if we should use mock images.
 */
function shouldUseMockImages(): boolean {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const isDev = process.env.NODE_ENV === "development";

  // Use mock images if in dev and no GCP project configured
  return isDev && !projectId;
}

/**
 * Generate a mock placeholder image URL for development.
 * Uses a deterministic URL based on exercise name for consistency.
 */
function generateMockImageUrl(exerciseName: string): string {
  // Use placehold.co (more reliable than via.placeholder.com)
  const width = 512;
  const height = 512;

  // Return a placeholder image with exercise name
  return `https://placehold.co/${width}x${height}/1a1a2e/ffffff.png?text=${encodeURIComponent(exerciseName.slice(0, 20))}`;
}

/**
 * Internal function to call Vertex AI Imagen API with configurable parameters.
 * Handles authentication, API calls, and response parsing.
 */
interface ImagenRequestParameters {
  sampleCount?: number;
  aspectRatio?: string;
  safetyFilterLevel?: string;
  negativePrompt?: string;
  personGeneration?: "allow_adult" | "dont_allow";
}

async function callImagenAPI(
  prompt: string,
  parameters: ImagenRequestParameters,
  logPrefix = "Imagen API"
): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable not set");
  }

  // Get access token from service account credentials
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not configured");
  }

  const { GoogleAuth } = await import("google-auth-library");
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    logger.error(
      "Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable",
      error,
      {
        route: "/api/image/generate",
        operation: "parse_credentials",
      }
    );
    throw new Error(
      getEnvAwareErrorMessage(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON must contain valid JSON credentials. Please check your .env.local file.",
        "GOOGLE_APPLICATION_CREDENTIALS_JSON must contain valid JSON credentials. Please check your deployment environment variables. For Firebase App Hosting, ensure secrets are configured in Cloud Secret Manager."
      )
    );
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new Error("Failed to get access token");
  }

  // Call Vertex AI Imagen endpoint
  // Using Imagen 3 (imagegeneration@006)
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${IMAGE_GENERATION_CONFIG.model}:predict`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount:
        parameters.sampleCount ?? IMAGE_GENERATION_CONFIG.sampleCount,
      aspectRatio:
        parameters.aspectRatio ?? IMAGE_GENERATION_CONFIG.aspectRatio,
      safetyFilterLevel:
        parameters.safetyFilterLevel ??
        IMAGE_GENERATION_CONFIG.safetyFilterLevel,
      ...(parameters.negativePrompt && {
        negativePrompt: parameters.negativePrompt,
      }),
      ...(parameters.personGeneration && {
        personGeneration: parameters.personGeneration,
      }),
    },
  };

  logger.info(`Calling ${logPrefix}`, {
    route: "/api/image/generate",
    endpoint,
    promptPreview: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""),
    parameters: requestBody.parameters,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`${logPrefix} error response`, new Error(errorText), {
      route: "/api/image/generate",
      status: response.status,
      statusText: response.statusText,
    });

    if (response.status === 429) {
      throw new Error("Image generation rate limit exceeded");
    }

    throw new Error(`Imagen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  logger.info(`${logPrefix} response received`, {
    route: "/api/image/generate",
    hasPredictions: !!data.predictions,
    predictionsCount: data.predictions?.length || 0,
    // Log any filtering/safety info if present
    ...(data.filteredCount !== undefined && {
      filteredCount: data.filteredCount,
    }),
  });

  if (!data.predictions || data.predictions.length === 0) {
    // Check for safety filtering - Imagen may return empty when content is blocked
    logger.error(`${logPrefix} returned no predictions`, undefined, {
      route: "/api/image/generate",
      operation: "parse_imagen_response",
    });
    throw new Error("SAFETY_FILTERED");
  }

  // Check for bytesBase64Encoded field
  // Imagen 3 response format usually matches: predictions[0].bytesBase64Encoded
  const prediction = data.predictions[0];
  const base64Image = prediction.bytesBase64Encoded;

  if (!base64Image) {
    logger.error(
      `Unexpected ${logPrefix} response format`,
      new Error("Missing bytesBase64Encoded"),
      {
        route: "/api/image/generate",
        operation: "extract_image_data",
      }
    );
    throw new Error("Invalid image data received from AI service");
  }

  return base64Image;
}

/**
 * Generate an image using Vertex AI Imagen REST API.
 *
 * Note: This requires:
 * - GOOGLE_CLOUD_PROJECT_ID: GCP project with Vertex AI API enabled
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON: Service account with aiplatform.endpoints.predict permission
 */
async function generateImageWithImagen(
  prompt: string,
  negativePrompts: string[]
): Promise<string> {
  return callImagenAPI(
    prompt,
    {
      sampleCount: IMAGE_GENERATION_CONFIG.sampleCount,
      aspectRatio: IMAGE_GENERATION_CONFIG.aspectRatio,
      safetyFilterLevel: IMAGE_GENERATION_CONFIG.safetyFilterLevel,
      negativePrompt:
        negativePrompts && negativePrompts.length > 0
          ? negativePrompts.join(", ")
          : undefined,
      personGeneration: IMAGE_GENERATION_CONFIG.personGeneration,
    },
    "Imagen API"
  );
}

/**
 * Build a simpler equipment-focused prompt (no people) for retry attempts.
 */
function buildEquipmentFocusedPrompt(exerciseName: string): string {
  return `
Professional fitness equipment photography showing the setup for "${exerciseName}" exercise.
Clean gym studio with professional lighting.
Focus on exercise equipment, weights, mats, or positioning markers.
No people in frame.
High quality, sharp focus, neutral background.
Style: Minimalist fitness catalog photography.
`.trim();
}

/**
 * Generate image with retry logic - falls back to equipment-focused prompt if filtered.
 * If all attempts fail, returns null to signal using a mock image.
 */
async function generateImageWithRetry(
  prompt: string,
  negativePrompts: string[],
  exerciseName: string
): Promise<string | null> {
  try {
    // First attempt with full prompt
    return await generateImageWithImagen(prompt, negativePrompts);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If safety filtered, retry with equipment-focused prompt (no person generation)
    if (errorMessage === "SAFETY_FILTERED") {
      logger.info("[Image Generation] Retrying with equipment-focused prompt", {
        route: "/api/image/generate",
        exerciseName,
      });
      try {
        const fallbackPrompt = buildEquipmentFocusedPrompt(exerciseName);
        return await generateImageWithImagenNoPersons(fallbackPrompt);
      } catch (retryError) {
        const retryErrorMessage =
          retryError instanceof Error ? retryError.message : String(retryError);

        // Log the retry error for debugging
        logger.error(
          "[Image Generation] Retry failed",
          retryError instanceof Error
            ? retryError
            : new Error(retryErrorMessage),
          {
            route: "/api/image/generate",
            exerciseName,
            operation: "retry_image_generation",
          }
        );

        // Propagate rate limits and other non-safety errors
        if (
          retryErrorMessage.includes("rate limit") ||
          retryErrorMessage.includes("quota") ||
          retryErrorMessage.includes("Imagen API error:")
        ) {
          throw retryError;
        }

        // Only fall back to mock for safety filtering on retry
        if (retryErrorMessage === "SAFETY_FILTERED") {
          logger.info("[Image Generation] Both attempts failed, using mock", {
            route: "/api/image/generate",
            exerciseName,
          });
          return null;
        }

        // For other errors, propagate them
        throw retryError;
      }
    }

    throw error;
  }
}

/**
 * Generate image without person generation settings (for equipment-only prompts).
 * Uses simplified parameters to avoid safety filtering.
 */
async function generateImageWithImagenNoPersons(
  prompt: string
): Promise<string> {
  return callImagenAPI(
    prompt,
    {
      sampleCount: 1,
      aspectRatio: "1:1",
      // No personGeneration, no negative prompts - keep it simple
    },
    "Imagen API (no-persons mode)"
  );
}

/**
 * Check if Firebase emulators are being used.
 * When emulators are active, we can't upload to real Firebase Storage.
 */
function isUsingEmulators(): boolean {
  return !!(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

/**
 * Save image to local public folder for development.
 * Returns a URL that can be served by Next.js.
 *
 * Security: Implements defense-in-depth path sanitization to prevent directory
 * traversal attacks. The storagePath parameter may contain user-controlled input
 * (workoutId, exerciseName), so we:
 * 1. Sanitize all path separators and dangerous characters
 * 2. Remove path traversal sequences (..)
 * 3. Extract only the filename component using path.basename()
 * 4. Validate the final resolved path stays within the intended directory
 */
async function saveImageLocally(
  base64Data: string,
  storagePath: string
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");

  // Create the directory structure in public/generated-images
  const publicDir = path.join(process.cwd(), "public", "generated-images");

  // Defense-in-depth sanitization to prevent directory traversal:
  // Step 1: Replace both forward and backslashes with underscores (handles Windows/Unix paths)
  // Step 2: Remove any path traversal sequences (..)
  // Step 3: Remove any other potentially dangerous characters (only allow alphanumeric, dots, dashes, underscores)
  const sanitized = storagePath
    .replace(/[/\\]/g, "_") // Replace both / and \ with _
    .replace(/\.\./g, "") // Remove .. sequences
    .replace(/[^a-zA-Z0-9._-]/g, "_"); // Remove any other potentially dangerous chars

  // Step 4: Use basename to ensure no directory components remain
  // This is an additional safety layer - even if sanitization missed something,
  // basename will extract only the filename portion
  const fileName = path.basename(sanitized);

  // Step 5: Validate final path is within publicDir (prevent traversal)
  // Use path.resolve() to normalize the path and check it doesn't escape the intended directory
  const filePath = path.join(publicDir, fileName);
  const resolvedPath = path.resolve(filePath);
  const resolvedPublicDir = path.resolve(publicDir);

  if (!resolvedPath.startsWith(resolvedPublicDir)) {
    throw new Error("Invalid path: directory traversal detected");
  }

  // Ensure directory exists
  await fs.mkdir(publicDir, { recursive: true });

  // Write the file
  const buffer = Buffer.from(base64Data, "base64");
  await fs.writeFile(filePath, buffer);

  logger.info("[Image Storage] Saved locally", {
    route: "/api/image/generate",
    fileName: `/generated-images/${fileName}`,
  });

  // Return URL that Next.js can serve
  return `/generated-images/${fileName}`;
}

/**
 * Upload base64 image to Firebase Storage and return URL.
 * Note: This uses the Admin SDK's bucket access.
 * When emulators are active, saves to local public folder instead.
 */
async function uploadToFirebaseStorage(
  base64Data: string,
  storagePath: string
): Promise<string> {
  // When using emulators, save locally since we can't access real Storage
  if (isUsingEmulators()) {
    return saveImageLocally(base64Data, storagePath);
  }

  const { getStorage } = await import("firebase-admin/storage");
  const bucket = getStorage().bucket();

  const buffer = Buffer.from(base64Data, "base64");
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  // Make the file publicly readable
  await file.makePublic();

  // Get the public URL
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

// ============================================
// POST Handler - Generate Single Image
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
        route: "/api/image/generate",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Per-user rate limit
    const rateLimit = await checkApiRateLimit(uid, "image_generate");
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

    const { prompt, negativePrompts, exerciseName, workoutId } =
      parseResult.data;

    // 3. Verify the workout belongs to this user
    const workoutDoc = await adminDb
      .collection("trainer_workouts")
      .doc(workoutId)
      .get();

    if (!workoutDoc.exists) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    if (workoutDoc.data()?.user_id !== uid) {
      return NextResponse.json(
        { error: "Unauthorized access to workout" },
        { status: 403 }
      );
    }

    // 4. Check if we should use mock images (dev mode without credentials)
    if (shouldUseMockImages()) {
      logger.info("[Image Generation] Using mock image", {
        route: "/api/image/generate",
        exerciseName,
      });
      const mockUrl = generateMockImageUrl(exerciseName);

      return NextResponse.json({
        imageUrl: mockUrl,
        storagePath: null,
        exerciseName,
        mock: true,
      });
    }

    // 5. Generate the image with Vertex AI Imagen (with retry on safety filter)
    const base64Image = await generateImageWithRetry(
      prompt,
      negativePrompts || [],
      exerciseName
    );

    // 5b. If Imagen failed (safety filtered), fall back to mock image
    if (base64Image === null) {
      logger.info("[Image Generation] Falling back to mock", {
        route: "/api/image/generate",
        exerciseName,
      });
      const mockUrl = generateMockImageUrl(exerciseName);
      return NextResponse.json({
        imageUrl: mockUrl,
        storagePath: null,
        exerciseName,
        mock: true,
        reason: "AI generation was filtered, using placeholder",
      });
    }

    // 6. Upload to Firebase Storage
    const timestamp = Date.now();
    const safeName = exerciseName.replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    const storagePath = `exercise-images/${workoutId}/${safeName}_${timestamp}.png`;

    const imageUrl = await uploadToFirebaseStorage(base64Image, storagePath);

    // 7. Return success
    return NextResponse.json({
      imageUrl,
      storagePath,
      exerciseName,
    });
  } catch (error) {
    // Capture error in Sentry for AI/Vertex AI issues tracking
    captureApiError(error, {
      endpoint: "image_generate",
      operation: "generate_image",
    });
    incrementMetric("ai.failure", 1, { endpoint: "image_generate" });

    logger.error("Image generation error", error, {
      route: "/api/image/generate",
      operation: "generate_image",
    });

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle specific error types
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      return NextResponse.json(
        {
          error: "Image generation rate limit exceeded",
          message: "The system is busy. Please try again later.",
        },
        { status: 429 }
      );
    }

    if (errorMessage === "SAFETY_FILTERED") {
      return NextResponse.json(
        {
          error: "Image could not be generated",
          message:
            "Content was filtered by safety settings. Try a different exercise.",
        },
        { status: 422 }
      );
    }

    if (
      errorMessage.includes("GOOGLE_CLOUD_PROJECT_ID") ||
      errorMessage.includes("credentials")
    ) {
      return NextResponse.json(
        { error: "Image generation service not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate image",
        ...(process.env.NODE_ENV === "development" && {
          message: errorMessage,
        }),
      },
      { status: 500 }
    );
  }
}
