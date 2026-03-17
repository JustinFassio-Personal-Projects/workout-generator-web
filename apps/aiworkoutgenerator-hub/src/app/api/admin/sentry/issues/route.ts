import { NextRequest, NextResponse } from "next/server";

import { adminDb, verifyIdToken } from "@/lib/firebase-admin";
import { requireAppCheck } from "@/lib/app-check";
import { logger } from "@/lib/logger";
import { captureApiError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

const SENTRY_API_BASE = "https://sentry.io/api/0";

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

async function isAdmin(uid: string): Promise<boolean> {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  return userDoc.exists && userDoc.data()?.role === "admin";
}

/** Minimal shape for admin UI; Sentry API returns more fields. */
export type SentryIssueSummary = {
  id: string;
  title: string;
  count: string;
  lastSeen: string;
  permalink: string;
  shortId?: string;
};

export async function GET(request: NextRequest) {
  const appCheckResult = await requireAppCheck(request);
  if (!appCheckResult.ok) return appCheckResult.response;

  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!token || !org || !project) {
    return NextResponse.json(
      {
        configured: false,
        message: "Sentry API not configured for runtime.",
      },
      { status: 503 }
    );
  }

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
      endpoint: "admin_sentry_issues",
      operation: "token_verification",
    });
    logger.error("Token verification failed", error, {
      route: "/api/admin/sentry/issues",
      operation: "token_verification",
    });
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  if (!(await isAdmin(uid))) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const url = `${SENTRY_API_BASE}/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?query=`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    captureApiError(error, {
      endpoint: "admin_sentry_issues",
      operation: "sentry_fetch",
    });
    logger.error("Sentry API request failed", error, {
      route: "/api/admin/sentry/issues",
      operation: "sentry_fetch",
    });
    return NextResponse.json(
      { error: "Failed to reach Sentry. Try again later." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    logger.error("Sentry API error", new Error(text), {
      route: "/api/admin/sentry/issues",
      status: res.status,
    });
    return NextResponse.json(
      { error: "Sentry returned an error. Check configuration." },
      { status: 502 }
    );
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid response from Sentry." },
      { status: 502 }
    );
  }

  const items = Array.isArray(raw) ? raw : [];
  const issues: SentryIssueSummary[] = items.map(
    (item: Record<string, unknown>) => {
      const metadata = item.metadata as Record<string, unknown> | undefined;
      return {
        id: String(item.id ?? ""),
        title: String(item.title ?? metadata?.title ?? "—"),
        count: String(item.count ?? "0"),
        lastSeen: String(item.lastSeen ?? ""),
        permalink: String(item.permalink ?? ""),
        shortId: item.shortId != null ? String(item.shortId) : undefined,
      };
    }
  );

  return NextResponse.json({ issues });
}
