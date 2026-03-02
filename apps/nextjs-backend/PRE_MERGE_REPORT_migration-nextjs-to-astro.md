# Pre-Merge Report — Migration / Next.js–Astro PR

**Branch:** `migration/nextjs-to-astro`  
**Scope:** Three-app architecture doc, Next.js deploy troubleshooting, Astro env example cleanup, blog Supabase fallback + safe error logging

---

## Phase 1 & 2: Triage and Implementation

### Critical / High (Security, Logic, Types)

- **Error logging in server logs**  
  **Comment:** Logging the full caught `error` object can include sensitive details in server logs.  
  **Action:** **Fixed.** Added file-scoped `safeErrorLog(error: unknown): string` in `lib/blog/queries.ts` that logs only `name`, `message`, and optional `cause.message` for `Error` instances; otherwise `String(error)`. Replaced every `console.error('...', error)` in that file with `console.error('...', safeErrorLog(error))`. No full error objects or stack traces are logged.

- **Types / Node APIs / client boundaries**  
  **Action:** **Verified.** No `any` types or loose interfaces introduced. `lib/blog/queries.ts` is server-only (used by Server Components and API routes); no `client:*` usage. Only `process.env.NEXT_PUBLIC_SITE_URL` is used (appropriate for server-side Next.js). No Node APIs (e.g. `fs`) in client components.

### Performance & Optimization

- No Copilot or scrub suggestions addressed Big O or database call count. No changes applied.

### Style & Architecture

- **Markdown table leading `||` (docs/THREE-APP-ARCHITECTURE.md)**  
  **Comment:** Tables use `||` at the start of each row; standard Markdown should use single `|`.  
  **Action:** **Ignored (false positive).** File content uses a single leading `|` per row. The comment likely referred to the diff display where the first `|` is the diff marker.

---

## Fixed

| Item                    | Location              | Action                                                                                                                                                                                            |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safe error logging      | `lib/blog/queries.ts` | Introduced `safeErrorLog()` and used it for all Supabase/connection error logging to avoid leaking stack traces or nested error details in server logs.                                           |
| Supabase client wrapper | `lib/blog/queries.ts` | Added file-scoped `withSupabaseClient()`; refactored 11 functions to use it; connection-failure logging and fallback centralized in one place.                                                    |
| Search query injection  | `lib/blog/queries.ts` | Added file-scoped `sanitizeSearchQuery()`; user input in `searchPosts()` is escaped for ilike (%, \_) and stripped of PostgREST filter-breaking chars (e.g. `,`, `(`, `)`) before use in `.or()`. |

---

## Ignored

| Suggestion / Topic                                 | Reason                                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Table rows use `\|\|` in THREE-APP-ARCHITECTURE.md | False positive: repo has single `\|`; no change.                                                                                    |
| New abstractions / utilities beyond `safeErrorLog` | **Implemented.** One additional file-scoped helper, `withSupabaseClient`, added in `lib/blog/queries.ts` (no project-wide utility). |

---

## Scrub Summary

- **No** TODOs, FIXMEs, or commented-out code blocks in changed files.
- **No** `any` or loose types in `lib/blog/queries.ts`.
- **No** client directives or Node APIs in client-facing code; changed code is server-only lib and docs.
- **astro-site/.env.example:** Placeholder URL only; no secrets. Server-only note added for `SUPABASE_SERVICE_ROLE_KEY`.
- **docs:** Markdown and links checked; tables valid.
- **Astro / build-time:** This PR does not modify any Astro `.astro` components or frontmatter; Astro `import.meta.env` and `client:*` usage were not in scope.

---

## Final gatekeeper review (pre-merge)

- **Critical:** Safe error logging and Supabase wrapper applied; **search query sanitization** added so user-controlled `query` in `searchPosts()` cannot inject PostgREST filter logic (ilike wildcards escaped, reserved chars stripped).
- **Types / boundaries:** No `any`; `lib/blog/queries.ts` remains server-only.
- **Performance:** No Big O or DB-call changes in this PR; no optimizations applied.
- **Style:** No new cross-file abstractions; helpers remain file-scoped in `lib/blog/queries.ts`.

---

## Status

**READY TO MERGE**

- Security: Server error logging uses a minimal, safe shape; search input is sanitized before use in `.or()` filters.
- Logic: Blog query fallbacks unchanged; connection handling and search safety improved.
- Types & boundaries: No new `any`; server-only code remains server-only.
- Style: Changes match existing patterns; no new cross-project abstractions.
- Build: `npm run type-check` and `npm run lint` pass (verified).

**Recommendation:** Run `npm run test:run` and `npm run build` (and `cd astro-site && npm run build` if desired) once more before merge to confirm full pipeline.
