# Sentry Implementation — SWOT Analysis

**Audit date:** February 2025  
**Method:** Sentry MCP server (ai-workout-generator org, US region) + codebase review  
**Org:** ai-workout-generator | **Project:** javascript-nextjs | **Region:** https://us.sentry.io

---

## Summary of Current Implementation

- **SDK:** `@sentry/nextjs` (^10.38.0) with client, server, and edge configs; client init in production (DSN) and in development (Spotlight); DSN-driven for production.
- **Instrumentation:** `instrumentation.ts` (onRequestError, register for server/edge), `instrumentation-client.ts` (captureRouterTransitionStart).
- **Error capture:** Centralized `src/lib/sentry.ts` (`captureApiError`, `captureMessage`, `setUserContext`, `clearUserContext`, `addBreadcrumb`); used in all API routes (37 route files) plus `global-error.tsx`. Coverage was expanded to include the remaining routes and all AI endpoints.
- **AI/LLM monitoring:** All Genkit/Gemini flows wrapped with `withGenAISpan()`; spans use `op: gen_ai.request` and token-usage attributes for Sentry AI Insights. See [SENTRY_AI_MONITORING.md](SENTRY_AI_MONITORING.md).
- **Admin:** `/api/admin/sentry/issues` (auth + App Check) fetches issues from Sentry API; admin monitoring page links to Sentry Issues and Alerts.
- **Releases:** Multiple releases with commit info; source maps uploaded via `withSentryConfig` (SENTRY_AUTH_TOKEN at build).
- **Client (Webpack):** React component annotations enabled (`webpack.reactComponentAnnotation: { enabled: true }`) so DOM elements are tagged with component names for errors and Session Replay; applies when building with Webpack only.
- **Spotlight (dev):** Client enables Spotlight in development (`spotlight: process.env.NODE_ENV === 'development'`) for local error/trace inspection without the Sentry dashboard. The overlay requires the Spotlight sidecar (e.g. `npx spotlight run -- npm run dev`); without it the SDK still runs but there is no local UI.
- **Logs:** Sentry Logs enabled (`enableLogs: true`) with `consoleLoggingIntegration` on client, server, and edge so output from `src/lib/logger.ts` (console.log/warn/error) is sent to Sentry and correlated with traces and errors. The logger’s existing sanitization (e.g. `sanitizeContext`) runs before data reaches console, so log content sent to Sentry is already sanitized in production.
- **Custom metrics (KPIs):** Business counters via `incrementMetric()` in `src/lib/sentry.ts` — `workout.generated`, `exercise.swapped`, `stripe.conversion`, and `ai.failure` — with attributes (e.g. `tier`, `endpoint`) for dashboards beyond raw error counts.
- **User Feedback:** `feedbackIntegration({ autoInject: false })` in client config; "Send feedback" on ErrorBoundary fallback and global-error page so users can submit context when errors occur.
- **Recent issues (MCP):** 1 unresolved (Stripe “No such price” — since fixed with live price IDs); 4 error events in last 7 days.

---

## Strengths

| Area                                | Detail                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Optional / graceful degradation** | Sentry client initializes in production when `NEXT_PUBLIC_SENTRY_DSN` is set, and in development for Spotlight (DSN optional). No DSN in dev logs a single console warning. `isSentryConfigured()` guards all helpers so the app works without Sentry. |
| **Consistent API error handling**   | `captureApiError()` gives a single pattern: endpoint tag, optional operation, optional userId (non-PII), requestId, extra. Used in all critical API routes (payments, webhooks, workout gen, image gen).                                               |
| **Privacy and redaction**           | Client config uses `beforeSend` to redact `request.headers.authorization`. Server/edge configs avoid PII; user context is ID-only.                                                                                                                     |
| **Noise reduction**                 | `ignoreErrors` filters ResizeObserver loop, non-Error rejections, and “Load failed” (e.g. image load) to cut dashboard noise.                                                                                                                          |
| **Performance and bundle**          | 100% `tracesSampleRate` on client/server/edge for early-stage performance baseline (reduce when traffic grows); `tunnelRoute: "/monitoring"` to bypass ad-blockers; `removeDebugLogging: true` to trim logger in prod.                                 |
| **Source maps and releases**        | `withSentryConfig` with env-driven org/project; source map upload at build (SENTRY_AUTH_TOKEN); releases visible in Sentry with commit metadata.                                                                                                       |
| **Admin integration**               | Admin monitoring page shows Sentry issues (via `/api/admin/sentry/issues`) and links to Sentry Issues/Alerts; endpoint protected by Firebase Auth + App Check + admin role.                                                                            |
| **Documentation and examples**      | Sentry example page/API (gated by `NEXT_PUBLIC_SENTRY_VERIFICATION_ENABLED`); docs reference (ENV_VARIABLES, blueprint, FIREBASE_APP_HOSTING_ENV_VARS) and SENTRY_MCP_SETUP for MCP.                                                                   |

---

## Weaknesses

| Area                                  | Detail                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin API region**                  | `/api/admin/sentry/issues` uses `SENTRY_API_BASE = "https://sentry.io/api/0"`. The org is on **US** region (`https://us.sentry.io`). For US orgs the API base should be `https://us.sentry.io/api/0` or an env-driven value (e.g. `SENTRY_API_BASE` or derive from org region). Using the default sentry.io host can cause 404s or wrong-region behavior. |
| **User context not set in app flows** | `setUserContext()` / `clearUserContext()` exist but are not called on login/logout (or in a root layout). Errors are still associated via `captureApiError(..., { userId })` in API routes, but client-side errors and unhandled route errors won’t have a stable user unless the app sets context.                                                       |
| **Breadcrumbs underused**             | `addBreadcrumb()` is available but not used in critical flows (e.g. checkout steps, workout generation steps). Fewer breadcrumbs mean harder debugging of “what led to this error.”                                                                                                                                                                       |
| **Single project**                    | All errors go to one project (`javascript-nextjs`). Acceptable for current scale; if you split (e.g. backend vs frontend or multiple apps), you’d need multi-project or org-level views.                                                                                                                                                                  |
| **Example routes in codebase**        | `sentry-example-page` and `sentry-example-api` remain in the repo (gated in prod). They add a small maintenance and surface area; consider removing or moving to a separate test app once onboarding is done.                                                                                                                                             |
| **No explicit Replay**                | Session Replay is enabled; User Feedback is enabled with `feedbackIntegration({ autoInject: false })` on the ErrorBoundary fallback and global-error page so users can submit context when errors occur. Replay remains the main optional UX-debugging feature.                                                                                           |

---

## Opportunities

| Area                             | Detail                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fix admin API region**         | Add `SENTRY_API_BASE` (or `NEXT_PUBLIC_SENTRY_URL`) from env, defaulting to `https://us.sentry.io` for this org, and use it in `/api/admin/sentry/issues` so the admin dashboard always talks to the correct region.                         |
| **Set user context on auth**     | In the auth provider or root layout, call `setUserContext(uid)` after sign-in and `clearUserContext()` on sign-out so all client and server errors can be grouped by user when available.                                                    |
| **Add breadcrumbs in key flows** | Add `addBreadcrumb()` in checkout (e.g. “checkout started”, “payment intent created”), workout generation (“generate started”, “model responded”), and Stripe webhook (“event received”, “event type”).                                      |
| **Use Sentry MCP and Seer**      | With MCP connected, use `get_issue_details` and `analyze_issue_with_seer` for triage and root-cause suggestions; optionally document “paste Sentry issue URL → run analysis” in team runbooks.                                               |
| **Alerts and SLAs**              | Define alert rules in Sentry (e.g. spike in errors, high error rate on checkout or webhooks) and optionally tie to PagerDuty/Slack; document in PRE_PR_VERIFICATION or ops docs.                                                             |
| **User Feedback on error pages** | User Feedback is enabled with `feedbackIntegration({ autoInject: false })`; the widget is shown only on the ErrorBoundary fallback and global-error page so feedback is captured in context when errors happen.                              |
| **AI Insights (implemented)**    | Genkit flows are instrumented with `withGenAISpan`; AI Agents dashboard shows performance, estimated token usage, and failures per flow. Token counts are character-based estimates. See [SENTRY_AI_MONITORING.md](SENTRY_AI_MONITORING.md). |

---

## Threats

| Area                        | Detail                                                                                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret and env drift**    | Sentry needs DSN, auth token (build), org, project in App Hosting and CI. If a deploy uses wrong org/project or missing token, source maps or issue ingestion can fail silently or go to the wrong project. Keep FIREBASE_APP_HOSTING_ENV_VARS and grantaccess in sync. |
| **Ad-blockers and tunnel**  | The `/monitoring` tunnel helps with ad-blockers but increases server load and can be abused if not rate-limited. Monitor traffic to `/monitoring` and consider rate limiting or firewall rules.                                                                         |
| **PII leakage**             | `beforeSend` and “user id only” reduce risk, but future code could add PII in `extra` or breadcrumbs. Keep code review and a short “Sentry data” checklist (no emails, names, tokens in context).                                                                       |
| **Cost and quota**          | Higher traffic and 10% traces will increase events. If you raise sample rates or add Replay, watch Sentry quota and billing; set error/trace budgets or sampling rules if needed.                                                                                       |
| **Region and multi-region** | Org is US-only. If you add EU or another region later, DSN, API base, and auth token must align per deployment.                                                                                                                                                         |

---

## Recommendations (Priority)

1. **High:** Use US Sentry API in admin: set `SENTRY_API_BASE` (e.g. `https://us.sentry.io/api/0`) or equivalent env and use it in `/api/admin/sentry/issues`.
2. **High:** Set Sentry user context on login/logout so client and unhandled errors are attributable.
3. **Medium:** Add breadcrumbs in checkout, workout generation, and webhook handler.
4. **Low:** Re-evaluate keeping or removing the Sentry example page/API once the team is comfortable with the setup.
5. **Ongoing:** Use Sentry MCP and Seer for new issues; document alert rules and runbooks.

---

_This SWOT was produced from Sentry MCP (whoami, find_organizations, find_projects, search_issues, find_releases, search_events) and from codebase files: sentry._.config.ts, src/lib/sentry.ts, instrumentation*, global-error, API routes using captureApiError, admin sentry API, next.config.ts, apphosting.yaml.*
