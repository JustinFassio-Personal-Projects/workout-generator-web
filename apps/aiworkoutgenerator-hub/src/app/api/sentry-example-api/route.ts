import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Same gating as the example page: only allow in dev or when verification is explicitly enabled in production
const verificationEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SENTRY_VERIFICATION_ENABLED === "true";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// A faulty API route to test Sentry's error monitoring (gated to avoid direct hits in production)
export function GET() {
  if (!verificationEnabled) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page."
  );
}
