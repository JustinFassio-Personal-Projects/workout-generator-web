import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase-admin";
import { maskIdentifier } from "@/lib/utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import type {
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  LegacyCreateSupportTicketRequest,
} from "@/types/support";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Request Schemas
// ============================================

// Legacy schema (for backward compatibility)
const LegacyRequestBodySchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.enum(["billing", "technical", "feature_request", "bug", "other"]),
  user_id: z.string().min(1, "User ID is required"),
  metadata: z
    .object({
      source: z.literal("website").optional(),
      source_url: z.string().optional(),
      device_type: z.enum(["mobile", "desktop", "tablet"]).optional(),
      subscription_tier: z.string().optional(),
      utm_params: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  website: z.string().optional(), // Honeypot - must be empty
});

// New schema with discriminated union
const BaseRequestSchema = z.object({
  type: z.enum([
    "workout_feedback",
    "bug",
    "billing",
    "feature",
    "coaching",
    "question",
  ]),
  impact: z.enum(["blocked", "major", "minor"]),
  user_id: z.string().min(1, "User ID is required"),
  context: z
    .object({
      app: z.string().optional(),
      route: z.string().optional(),
      url: z.string().optional(),
      userAgent: z.string().optional(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
      timestampClient: z.string().optional(),
      workoutId: z.string().optional(),
      workoutCreatedAt: z.string().optional(),
      generatorInputs: z
        .object({
          goal: z.string().optional(),
          equipment: z.array(z.string()).optional(),
          duration: z.number().optional(),
          split: z.string().optional(),
          constraints: z.array(z.string()).optional(),
        })
        .optional(),
      workoutSummary: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  metadata: z
    .object({
      source: z.literal("website").optional(),
      source_url: z.string().optional(),
      device_type: z.enum(["mobile", "desktop", "tablet"]).optional(),
      subscription_tier: z.string().optional(),
      utm_params: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  website: z.string().optional(), // Honeypot - must be empty
});

const WorkoutFeedbackRequestSchema = BaseRequestSchema.extend({
  type: z.literal("workout_feedback"),
  workoutFeedback: z.object({
    workoutId: z.string().optional(),
    intensity: z.enum(["too_easy", "right", "too_hard", "unsure"]).optional(),
    timeFit: z.enum(["too_short", "right", "too_long"]).optional(),
    mismatchTags: z.array(z.string()).optional(),
    goal: z.string().optional(),
    winConditions: z.array(z.string()).optional(),
    freeText: z.string().optional(),
    followUpOk: z.boolean().optional(),
  }),
});

const BugReportRequestSchema = BaseRequestSchema.extend({
  type: z.literal("bug"),
  bugReport: z.object({
    whatHappened: z
      .string()
      .min(10, "What happened is required (min 10 characters)"),
    stepsToReproduce: z.string().min(1, "Steps to reproduce are required"),
    expectedVsActual: z
      .string()
      .min(1, "Expected vs actual behavior is required"),
  }),
});

const BillingRequestSchema = BaseRequestSchema.extend({
  type: z.literal("billing"),
  billing: z.object({
    issueType: z.enum([
      "upgrade_downgrade",
      "charges",
      "cancellations",
      "receipts",
    ]),
    description: z.string().min(10),
  }),
});

const FeatureIdeaRequestSchema = BaseRequestSchema.extend({
  type: z.literal("feature"),
  feature: z.object({
    featureName: z.string().min(5).max(200),
    whyHelpful: z.string().min(10),
  }),
});

const CoachingRequestSchema = BaseRequestSchema.extend({
  type: z.literal("coaching"),
  coaching: z.object({
    whatNeedHelpWith: z
      .string()
      .min(10, "What you need help with is required (min 10 characters)"),
    currentChallenges: z.string().min(1, "Current challenges are required"),
  }),
});

const QuestionRequestSchema = BaseRequestSchema.extend({
  type: z.literal("question"),
  question: z.object({
    topic: z.string().min(5).max(200),
    question: z.string().min(10),
  }),
});

const NewRequestBodySchema = z.discriminatedUnion("type", [
  WorkoutFeedbackRequestSchema,
  BugReportRequestSchema,
  BillingRequestSchema,
  FeatureIdeaRequestSchema,
  CoachingRequestSchema,
  QuestionRequestSchema,
]);

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 0. Check if Cloud Function URL is configured
    const cloudFunctionUrl = process.env.FIREBASE_CLOUD_FUNCTION_URL;
    if (!cloudFunctionUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Support ticket service is not configured",
        } satisfies CreateSupportTicketResponse,
        { status: 500 }
      );
    }

    // 1. Parse request body
    const body = await request.json();

    // 2. Check honeypot field (silently reject if filled)
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json(
        {
          success: true,
          ticketId: "spam-rejected",
        } satisfies CreateSupportTicketResponse,
        { status: 200 }
      );
    }

    // 3. Determine if this is legacy or new format
    const isLegacyFormat = !body.type && body.subject && body.priority;

    let validatedData:
      | CreateSupportTicketRequest
      | LegacyCreateSupportTicketRequest;
    let parseResult;

    if (isLegacyFormat) {
      // Legacy format
      parseResult = LegacyRequestBodySchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid request body",
          } satisfies CreateSupportTicketResponse,
          { status: 400 }
        );
      }
      validatedData = parseResult.data as LegacyCreateSupportTicketRequest;
    } else {
      // New format
      parseResult = NewRequestBodySchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid request body",
          } satisfies CreateSupportTicketResponse,
          { status: 400 }
        );
      }
      validatedData = parseResult.data as CreateSupportTicketRequest;
    }

    // 4. Require user_id - users must be authenticated
    if (!validatedData.user_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required. Please log in to submit a support ticket.",
        } satisfies CreateSupportTicketResponse,
        { status: 401 }
      );
    }

    const userId = validatedData.user_id;

    // 5. Verify user exists in Firestore (optional check, Cloud Function will validate)
    try {
      const userDocRef = adminDb.collection("users").doc(userId);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        const isUsingEmulators =
          process.env.FIRESTORE_EMULATOR_HOST ||
          process.env.FIREBASE_AUTH_EMULATOR_HOST;

        if (isUsingEmulators) {
          logger.info(
            "User not found in Firestore (emulator mode), proceeding with user_id",
            {
              route: "/api/support/create",
              userId: maskIdentifier(userId),
            }
          );
        } else {
          logger.warn(
            "User not found in Firestore (production mode)",
            undefined,
            {
              route: "/api/support/create",
              userId: maskIdentifier(userId),
            }
          );
        }
      } else {
        logger.info("User verified in Firestore", {
          route: "/api/support/create",
          userId: maskIdentifier(userId),
        });
      }
    } catch (error) {
      logger.warn("Error verifying user", error, {
        route: "/api/support/create",
        userId: maskIdentifier(userId),
      });
    }

    // 6. Prepare request to Cloud Function
    // For new format, send as-is. For legacy, convert to new format structure
    // Using Record<string, unknown> for flexibility when sending to Cloud Function
    let payload: Record<string, unknown>;

    if (isLegacyFormat) {
      // Convert legacy to new format for Cloud Function
      const legacy = validatedData as LegacyCreateSupportTicketRequest;
      payload = {
        type:
          legacy.category === "bug"
            ? "bug"
            : legacy.category === "billing"
              ? "billing"
              : legacy.category === "feature_request"
                ? "feature"
                : "workout_feedback",
        impact:
          legacy.priority === "urgent"
            ? "blocked"
            : legacy.priority === "high"
              ? "major"
              : "minor",
        user_id: legacy.user_id,
        subject: legacy.subject,
        description: legacy.description,
        metadata: legacy.metadata || {},
        website: "",
      };
    } else {
      // New format - ensure subject is included
      const newFormat = validatedData as CreateSupportTicketRequest;
      payload = { ...newFormat };

      // Ensure subject is always present (required by Cloud Function)
      if (!payload.subject) {
        const typeLabels: Record<string, string> = {
          workout_feedback: "Fix my workout",
          bug: "Something's broken",
          billing: "Billing / account",
          feature: "Feature idea",
          coaching: "Coaching / program help",
        };
        const requestType =
          typeof payload.type === "string" ? payload.type : "workout_feedback";
        payload.subject =
          typeLabels[requestType] || requestType || "Support Request";
      }
    }

    // 7. Prepare headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add function key if configured
    const functionKey = process.env.FIREBASE_FUNCTION_KEY;
    if (functionKey) {
      headers["x-function-key"] = functionKey;
    }

    // 8. Forward request to Cloud Function
    // Ensure subject is always included for Cloud Function compatibility
    if (!payload.subject && payload.type && payload.impact) {
      // Fallback: generate subject if missing
      const typeLabels: Record<string, string> = {
        workout_feedback: "Fix my workout",
        bug: "Something's broken",
        billing: "Billing / account",
        feature: "Feature idea",
        coaching: "Coaching / program help",
        question: "Question",
      };
      const requestType =
        typeof payload.type === "string" ? payload.type : "workout_feedback";
      payload.subject =
        typeLabels[requestType] || requestType || "Support Request";
    }

    // Final safety check - ensure subject exists
    const subjectValue =
      typeof payload.subject === "string" ? payload.subject : "";
    if (!subjectValue || subjectValue.trim() === "") {
      payload.subject = "Support Request";
    }

    // Log the actual payload being sent (for debugging)
    const payloadString = JSON.stringify(payload);
    logger.info("Sending support ticket request to Cloud Function", {
      route: "/api/support/create",
      type: payload.type || "legacy",
      impact:
        typeof payload.impact === "string"
          ? payload.impact
          : typeof (payload as unknown as { priority?: string }).priority ===
              "string"
            ? (payload as unknown as { priority: string }).priority
            : "minor",
      has_subject: !!payload.subject,
      has_metadata: !!payload.metadata,
      user_id: maskIdentifier(
        typeof payload.user_id === "string" ? payload.user_id : ""
      ),
      payload_keys: Object.keys(payload),
      payload_includes_subject_string: payloadString.includes('"subject"'),
    });

    const response = await fetch(cloudFunctionUrl, {
      method: "POST",
      headers,
      body: payloadString,
    });

    // 9. Parse response - handle both JSON and non-JSON responses
    let data: {
      success?: boolean;
      error?: string;
      [key: string]: unknown;
    } | null = null;
    let responseText: string = "";

    try {
      responseText = await response.text();

      // Try to parse as JSON
      if (responseText && responseText.trim() !== "") {
        try {
          data = JSON.parse(responseText) as {
            success?: boolean;
            error?: string;
            [key: string]: unknown;
          };
        } catch {
          // Response is not JSON - log and create error object
          logger.error(
            "Cloud Function returned non-JSON response",
            new Error("Non-JSON response"),
            {
              route: "/api/support/create",
              status: response.status,
              statusText: response.statusText,
              contentType: response.headers.get("content-type"),
              user_id: maskIdentifier(
                typeof payload.user_id === "string" ? payload.user_id : ""
              ),
            }
          );

          // Create a structured error response
          data = {
            error:
              responseText.length > 0
                ? `Cloud Function error: ${responseText.substring(0, 200)}`
                : `Cloud Function returned ${response.status} ${response.statusText}`,
          };
        }
      } else {
        // Empty response
        logger.error(
          "Cloud Function returned empty response",
          new Error("Empty response"),
          {
            route: "/api/support/create",
            status: response.status,
            statusText: response.statusText,
            user_id: maskIdentifier(
              typeof payload.user_id === "string" ? payload.user_id : ""
            ),
          }
        );
        data = {
          error: `Cloud Function returned ${response.status} ${response.statusText}`,
        };
      }
    } catch (fetchError) {
      // Network or fetch error
      logger.error("Error fetching from Cloud Function", fetchError, {
        route: "/api/support/create",
        user_id: maskIdentifier(
          typeof payload.user_id === "string" ? payload.user_id : ""
        ),
        cloudFunctionUrl: cloudFunctionUrl,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to connect to support service. Please try again later.",
        } satisfies CreateSupportTicketResponse,
        { status: 503 }
      );
    }

    // 10. Handle response
    if (!response.ok) {
      logger.error(
        "Error calling Cloud Function",
        new Error((data?.error as string) || "Unknown error"),
        {
          route: "/api/support/create",
          status: response.status,
          statusText: response.statusText,
          user_id: maskIdentifier(
            typeof payload.user_id === "string" ? payload.user_id : ""
          ),
          type: payload.type || "legacy",
          cloudFunctionUrl: cloudFunctionUrl,
          isEmulatorUrl:
            cloudFunctionUrl.includes("localhost") ||
            cloudFunctionUrl.includes("127.0.0.1"),
        }
      );

      // If "User not found" error, check if user exists in Firestore
      if (
        data?.error?.toLowerCase().includes("user not found") ||
        data?.error?.toLowerCase().includes("user_not_found")
      ) {
        logger.error(
          "Cloud Function reported 'User not found'. Checking Firestore emulator...",
          new Error("User not found"),
          {
            route: "/api/support/create",
            user_id: maskIdentifier(
              typeof payload.user_id === "string" ? payload.user_id : ""
            ),
          }
        );
        try {
          const userId =
            typeof payload.user_id === "string" ? payload.user_id : "";
          const userDocRef = adminDb.collection("users").doc(userId);
          const userDoc = await userDocRef.get();
          logger.error(
            "User document check",
            new Error("User not found in Firestore"),
            {
              route: "/api/support/create",
              exists: userDoc.exists,
              user_id: maskIdentifier(
                typeof payload.user_id === "string" ? payload.user_id : ""
              ),
              hasData: userDoc.exists
                ? Object.keys(userDoc.data() || {}).length
                : 0,
              isUsingEmulators: !!(
                process.env.FIRESTORE_EMULATOR_HOST ||
                process.env.FIREBASE_AUTH_EMULATOR_HOST
              ),
            }
          );
        } catch (checkError) {
          logger.error("Error checking user document", checkError, {
            route: "/api/support/create",
            operation: "check_user_document",
          });
        }
      }

      // Handle rate limiting
      if (response.status === 429) {
        logger.warn("Rate limit exceeded", undefined, {
          route: "/api/support/create",
          user_id: maskIdentifier(
            typeof payload.user_id === "string" ? payload.user_id : ""
          ),
          retryAfter: data.retryAfter,
        });
        return NextResponse.json(
          {
            success: false,
            error:
              typeof data.error === "string" ? data.error : "Too many requests",
            retryAfter:
              typeof data.retryAfter === "number" ? data.retryAfter : undefined,
          } satisfies CreateSupportTicketResponse,
          { status: 429 }
        );
      }

      // Handle validation errors
      if (response.status === 400) {
        return NextResponse.json(
          {
            success: false,
            error: data.error || "Validation error",
          } satisfies CreateSupportTicketResponse,
          { status: 400 }
        );
      }

      // Handle other errors
      return NextResponse.json(
        {
          success: false,
          error: data?.error || `Internal server error (${response.status})`,
        } satisfies CreateSupportTicketResponse,
        { status: response.status >= 500 ? 500 : response.status }
      );
    }

    // 11. Return success
    const ticketId =
      data &&
      typeof data === "object" &&
      "ticketId" in data &&
      typeof data.ticketId === "string"
        ? data.ticketId
        : undefined;
    return NextResponse.json({
      success: true,
      ticketId,
    } satisfies CreateSupportTicketResponse);
  } catch (error) {
    captureApiError(error, {
      endpoint: "support_create",
      operation: "create_support_ticket",
    });
    logger.error("Support ticket creation error", error, {
      route: "/api/support/create",
      operation: "create_support_ticket",
    });

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create support ticket",
      } satisfies CreateSupportTicketResponse,
      { status: 500 }
    );
  }
}
