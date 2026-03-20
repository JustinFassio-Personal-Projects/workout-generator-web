/**
 * Website analytics session ID (wg_session_id) from the marketing site's Workout Plan Builder.
 * Used to send account_signup_complete with the same session_id so admin can attribute
 * signups to the builder funnel (Option A).
 */

const STORAGE_KEY = "wg_website_session_id";

export function setWebsiteSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, sessionId);
  } catch {
    // ignore
  }
}

export function getWebsiteSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearWebsiteSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Marketing site base URL for analytics API (track-event). Hub POSTs account_signup_complete here.
 */
function getMarketingSiteBaseUrl(): string {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:4321";
  }
  return (
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL ||
    "https://aiworkoutgenerator.com"
  );
}

/**
 * Fire-and-forget: send account_signup_complete to marketing site analytics so the session is
 * attributed in the admin Auth & onboarding funnel. Call after successful signup (email or OAuth).
 */
export function trackAccountSignupComplete(options: {
  method: "email" | "oauth";
}): void {
  const sessionId = getWebsiteSessionId();
  if (!sessionId) return;

  const base = getMarketingSiteBaseUrl();
  const url = `${base.replace(/\/$/, "")}/api/analytics/track-event`;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_name: "account_signup_complete",
      session_id: sessionId,
      user_id: null,
      properties: { method: options.method },
    }),
    mode: "cors",
  }).catch(() => {});

  clearWebsiteSessionId();
}
