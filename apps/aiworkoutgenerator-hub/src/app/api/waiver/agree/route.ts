import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import type { LiabilityWaiver, UserWaiverAgreement } from "@/types/firestore";
import {
  resolveIdToken,
  getTokenSource,
  calculateVersionHash,
  getClientIp,
} from "@/lib/api-utils";
import { DEFAULT_WAIVER_TEXT } from "@/lib/waiver/default-waiver-text";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";
import type { WaiverAgreementRequest } from "@/types/waiver";

/** Version and hash for the built-in fallback waiver (shown when API fetch fails). */
const FALLBACK_WAIVER_VERSION = "1.0.0";
const FALLBACK_WAIVER_HASH = calculateVersionHash(DEFAULT_WAIVER_TEXT);

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Request Schema
// ============================================

const AgreementRequestSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  agreement_checkboxes: z.object({
    medical_disclaimer: z.boolean(),
    assumption_of_risk: z.boolean(),
    release_of_liability: z.boolean(),
    arbitration: z.boolean(),
    ai_disclaimer: z.boolean(),
    full_terms: z.boolean(),
  }),
  waiver_version: z.string().min(1, "Waiver version is required"),
  waiver_version_hash: z.string().min(1, "Waiver version hash is required"),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Validate that all required checkboxes are checked.
 */
function validateCheckboxes(
  checkboxes: WaiverAgreementRequest["agreement_checkboxes"]
): boolean {
  return (
    checkboxes.medical_disclaimer &&
    checkboxes.assumption_of_risk &&
    checkboxes.release_of_liability &&
    checkboxes.arbitration &&
    checkboxes.ai_disclaimer &&
    checkboxes.full_terms
  );
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    // 1. Parse body first (needed for resolveIdToken body fallback when proxies strip headers)
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const bodyObj = body as Record<string, unknown>;
    const idToken = resolveIdToken(request, bodyObj);
    const tokenSource = getTokenSource(request, bodyObj);

    if (!idToken) {
      logger.warn("Waiver agree: no token found", undefined, {
        route: "/api/waiver/agree",
        source: tokenSource,
      });
      return NextResponse.json(
        { error: "Missing or invalid authorization" },
        { status: 401 }
      );
    }

    let uid: string;
    try {
      const decodedToken = await verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error) {
      const errorCode =
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? ((error as { code: string }).code as string)
          : "unknown";
      logger.error("Token verification failed", error, {
        route: "/api/waiver/agree",
        operation: "token_verification",
        source: tokenSource,
        errorCode,
      });
      const message =
        errorCode === "auth/id-token-expired"
          ? "Session may have expired. Please sign out and sign in again, then try agreeing to the waiver."
          : "Invalid or expired token. Please refresh the page and try again.";
      return NextResponse.json(
        { error: "Invalid or expired token", message },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const parseResult = AgreementRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // 3. Look up the specific waiver version the user is agreeing to
    // LEGAL COMPLIANCE: Use the version the user actually read, not the "current active" version
    // This prevents agreements being recorded against a version the user never saw
    const waiverVersionQuery = await adminDb
      .collection("liability_waivers")
      .where("version", "==", input.waiver_version)
      .limit(1)
      .get();

    let waiver: LiabilityWaiver;

    if (!waiverVersionQuery.empty) {
      const waiverDoc = waiverVersionQuery.docs[0];
      const waiverData = waiverDoc.data() as LiabilityWaiver;
      // Ensure id is not duplicated (waiverData may already have id from data())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _unused, ...waiverDataWithoutId } = waiverData;
      waiver = {
        id: waiverDoc.id,
        ...waiverDataWithoutId,
      } as LiabilityWaiver;
    } else if (
      input.waiver_version === FALLBACK_WAIVER_VERSION &&
      input.waiver_version_hash === FALLBACK_WAIVER_HASH
    ) {
      // Fallback waiver: shown when /api/waiver/active fails (e.g. network, Firestore down).
      // User agreed to DEFAULT_WAIVER_TEXT; accept and record the agreement.
      // The waiver doc may not exist in Firestore, but the agreement is the legal record.
      waiver = {
        id: "fallback",
        version: FALLBACK_WAIVER_VERSION,
        version_hash: FALLBACK_WAIVER_HASH,
        title: "Liability Waiver and Terms of Service",
        content: DEFAULT_WAIVER_TEXT,
        is_active: true,
        created_by: "system",
        created_at: {
          seconds: Math.floor(Date.now() / 1000),
        } as LiabilityWaiver["created_at"],
        updated_at: {
          seconds: Math.floor(Date.now() / 1000),
        } as LiabilityWaiver["updated_at"],
        effective_date: {
          seconds: Math.floor(Date.now() / 1000),
        } as LiabilityWaiver["effective_date"],
      };
    } else {
      return NextResponse.json(
        {
          error: "Invalid waiver version",
          message: `Waiver version ${input.waiver_version} does not exist. Please refresh the page and try again.`,
        },
        { status: 400 }
      );
    }

    // 4. Validate the version hash matches the actual waiver content
    // This ensures the user agreed to the exact content we have on record
    const expectedHash = calculateVersionHash(waiver.content);
    if (input.waiver_version_hash !== expectedHash) {
      return NextResponse.json(
        {
          error: "Waiver content mismatch",
          message:
            "The waiver content has changed. Please refresh the page and review the updated waiver before agreeing.",
        },
        { status: 400 }
      );
    }

    // 5. Validate all checkboxes are checked
    if (!validateCheckboxes(input.agreement_checkboxes)) {
      return NextResponse.json(
        {
          error: "All checkboxes must be checked",
          message: "You must agree to all sections of the waiver to proceed.",
        },
        { status: 400 }
      );
    }

    // 6. Validate full name (must be at least 2 words)
    const nameParts = input.full_name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return NextResponse.json(
        {
          error: "Invalid full name",
          message: "Please enter your full name (first and last name).",
        },
        { status: 400 }
      );
    }

    // 7. Check if user already agreed to this specific version
    const existingAgreementsRef = adminDb.collection("user_waiver_agreements");
    const existingSnapshot = await existingAgreementsRef
      .where("user_id", "==", uid)
      .where("waiver_version", "==", waiver.version)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      // User already agreed to this version - return existing agreement
      const existingDoc = existingSnapshot.docs[0];
      return NextResponse.json({
        success: true,
        agreement_id: existingDoc.id,
        waiver_version: waiver.version,
        message: "You have already agreed to this waiver version.",
      });
    }

    // 8. Capture audit trail data
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || null;

    // 9. Create agreement document
    const agreementRef = adminDb.collection("user_waiver_agreements").doc();
    const now = Timestamp.now();

    // 9. Create agreement document using the version the user actually agreed to
    const agreement: Omit<UserWaiverAgreement, "id"> = {
      user_id: uid,
      waiver_version: waiver.version, // Use the version from the request, not "current active"
      waiver_version_hash: input.waiver_version_hash, // Use the hash from the request
      full_name: input.full_name.trim(),
      agreement_checkboxes: input.agreement_checkboxes,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: now as unknown as UserWaiverAgreement["created_at"],
    };

    await agreementRef.set(agreement);

    // 10. Return success response
    return NextResponse.json({
      success: true,
      agreement_id: agreementRef.id,
      waiver_version: waiver.version,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "waiver_agree",
      operation: "create_waiver_agreement",
    });
    logger.error("Waiver agreement error", error, {
      route: "/api/waiver/agree",
      operation: "create_waiver_agreement",
    });

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Failed to save waiver agreement",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
