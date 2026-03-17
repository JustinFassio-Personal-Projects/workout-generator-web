import { NextRequest, NextResponse } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import type { LiabilityWaiver } from "@/types/firestore";
import {
  extractBearerToken,
  calculateVersionHash,
  isAdmin,
} from "@/lib/api-utils";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// ============================================
// Request Schemas
// ============================================

const CreateWaiverSchema = z.object({
  version: z.string().min(1, "Version is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(100, "Content must be at least 100 characters"),
  is_active: z.boolean().default(false),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Deactivate all existing active waivers.
 */
async function deactivateAllWaivers(): Promise<void> {
  const activeWaivers = await adminDb
    .collection("liability_waivers")
    .where("is_active", "==", true)
    .get();

  const batch = adminDb.batch();
  activeWaivers.docs.forEach((doc) => {
    batch.update(doc.ref, {
      is_active: false,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  if (!activeWaivers.empty) {
    await batch.commit();
  }
}

// ============================================
// GET Handler - List All Waivers
// ============================================

export async function GET(request: NextRequest) {
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
        endpoint: "admin_waivers",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/waivers",
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

    // 3. Fetch all waivers
    const waiversSnapshot = await adminDb
      .collection("liability_waivers")
      .orderBy("effective_date", "desc")
      .get();

    const waivers = waiversSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LiabilityWaiver[];

    return NextResponse.json({
      success: true,
      waivers,
      count: waivers.length,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_waivers",
      operation: "list_waivers",
    });
    logger.error("Error listing waivers", error, {
      route: "/api/admin/waivers",
      operation: "list_waivers",
    });
    return NextResponse.json(
      {
        error: "Failed to list waivers",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST Handler - Create New Waiver
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
        endpoint: "admin_waivers",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/waivers",
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
    const parseResult = CreateWaiverSchema.safeParse(body);

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

    // 4. Check if version already exists
    const existingVersion = await adminDb
      .collection("liability_waivers")
      .where("version", "==", input.version)
      .limit(1)
      .get();

    if (!existingVersion.empty) {
      return NextResponse.json(
        {
          error: "Version already exists",
          message: `A waiver with version "${input.version}" already exists.`,
        },
        { status: 409 }
      );
    }

    // 5. If activating this waiver, deactivate all others
    if (input.is_active) {
      await deactivateAllWaivers();
    }

    // 6. Calculate version hash
    const versionHash = calculateVersionHash(input.content);

    // 7. Create waiver document
    const waiverRef = adminDb.collection("liability_waivers").doc();
    const now = Timestamp.now();

    const waiver: Omit<LiabilityWaiver, "id"> = {
      version: input.version,
      version_hash: versionHash,
      title: input.title,
      content: input.content,
      is_active: input.is_active,
      created_by: uid,
      created_at: now as unknown as LiabilityWaiver["created_at"],
      updated_at: now as unknown as LiabilityWaiver["updated_at"],
      effective_date: now as unknown as LiabilityWaiver["effective_date"],
    };

    await waiverRef.set(waiver);

    return NextResponse.json({
      success: true,
      waiver: {
        id: waiverRef.id,
        ...waiver,
        created_at: waiver.created_at?.toDate?.() || waiver.created_at,
        updated_at: waiver.updated_at?.toDate?.() || waiver.updated_at,
        effective_date:
          waiver.effective_date?.toDate?.() || waiver.effective_date,
      },
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_waivers",
      operation: "create_waiver",
    });
    logger.error("Error creating waiver", error, {
      route: "/api/admin/waivers",
      operation: "create_waiver",
    });
    return NextResponse.json(
      {
        error: "Failed to create waiver",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
