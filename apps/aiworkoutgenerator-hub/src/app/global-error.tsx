"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect, useRef } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const feedbackButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    const el = feedbackButtonRef.current;
    if (!el) return;
    const feedback = Sentry.getFeedback();
    feedback?.attachTo(el);
  }, []);

  return (
    <html lang="en">
      <body style={{ padding: "1rem" }}>
        {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
        <NextError statusCode={0} />
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <button
            ref={feedbackButtonRef}
            type="button"
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Send feedback
          </button>
        </div>
      </body>
    </html>
  );
}
