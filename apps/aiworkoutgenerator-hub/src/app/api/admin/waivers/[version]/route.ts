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

const UpdateWaiverSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(100).optional(),
  is_active: z.boolean().optional(),
});

// ============================================
// Helper Functions
// ============================================

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
// GET Handler - Get Waiver by Version
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  try {
    const { version } = await params;

    // 1. Authenticate request
    const idToken = extractBearerToken(request);
    if (!idToken) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (error) {
      captureApiError(error, {
        endpoint: "admin_waivers_version",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/waivers/[version]",
        operation: "token_verification",
      });
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 2. Check admin role
    if (!(await isAdmin(decodedToken.uid))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 3. Get waiver by version
    const decodedVersion = decodeURIComponent(version);
    const waiverSnapshot = await adminDb
      .collection("liability_waivers")
      .where("version", "==", decodedVersion)
      .limit(1)
      .get();

    if (waiverSnapshot.empty) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    const doc = waiverSnapshot.docs[0];
    const data = doc.data();
    const waiver: LiabilityWaiver = {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at,
      effective_date: data.effective_date?.toDate?.() || data.effective_date,
    } as LiabilityWaiver;

    return NextResponse.json({
      success: true,
      waiver,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_waivers_version",
      operation: "get_waiver",
    });
    logger.error("Error getting waiver", error, {
      route: "/api/admin/waivers/[version]",
      operation: "get_waiver",
    });
    return NextResponse.json(
      {
        error: "Failed to get waiver",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT Handler - Update Waiver
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;
  const { version } = await params;
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
        endpoint: "admin_waivers_version",
        operation: "token_verification",
      });
      logger.error("Token verification failed", error, {
        route: "/api/admin/waivers/[version]",
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

    // 3. Get existing waiver
    const decodedVersion = decodeURIComponent(version);
    const waiverSnapshot = await adminDb
      .collection("liability_waivers")
      .where("version", "==", decodedVersion)
      .limit(1)
      .get();

    if (waiverSnapshot.empty) {
      return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
    }

    const waiverDoc = waiverSnapshot.docs[0];

    // 4. Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateWaiverSchema.safeParse(body);

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

    // 5. If activating this waiver, deactivate all others
    if (input.is_active === true) {
      await deactivateAllWaivers();
    }

    // 6. Prepare update data
    const updateData: Partial<LiabilityWaiver> = {
      updated_at: Timestamp.now() as unknown as LiabilityWaiver["updated_at"],
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
      // Recalculate hash if content changed
      updateData.version_hash = calculateVersionHash(input.content);
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
      if (input.is_active) {
        updateData.effective_date =
          Timestamp.now() as unknown as LiabilityWaiver["effective_date"];
      }
    }

    // 7. Update waiver
    await waiverDoc.ref.update(updateData);

    // 8. Get updated waiver
    const updatedDoc = await waiverDoc.ref.get();
    const updatedData = updatedDoc.data();
    const updatedWaiver: LiabilityWaiver = {
      id: updatedDoc.id,
      ...updatedData,
      created_at:
        updatedData?.created_at?.toDate?.() || updatedData?.created_at,
      updated_at:
        updatedData?.updated_at?.toDate?.() || updatedData?.updated_at,
      effective_date:
        updatedData?.effective_date?.toDate?.() || updatedData?.effective_date,
    } as LiabilityWaiver;

    return NextResponse.json({
      success: true,
      waiver: updatedWaiver,
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_waivers_version",
      operation: "update_waiver",
    });
    logger.error("Error updating waiver", error, {
      route: "/api/admin/waivers/[version]",
      operation: "update_waiver",
    });
    return NextResponse.json(
      {
        error: "Failed to update waiver",
        ...(process.env.NODE_ENV === "development" && {
          message: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
