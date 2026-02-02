# Pre-Merge Report — Deep Research Feature PR

**Branch:** `feature/see-how-it-works`  
**Scope:** Deep Research (admin CRUD, public index/detail, profile filtering, sitemap, validation)

---

## Fixed

| Item                                                | Action                                                                                                                                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTML_CONTENT_MAX_SIZE documentation**             | Added rationale comment in `lib/deep-research/validation.ts`: "Conservative max HTML content size to keep payloads small and within typical DB/performance constraints" so the 500KB limit is documented where the constant lives. |
| _(No critical security/logic or type issues found)_ | Scrub did not identify vulnerabilities, race conditions, off-by-one errors, or improper error handling. No `any` types or loose interfaces introduced in deep-research code.                                                       |

---

## Ignored / Out of Scope

| Suggestion / Topic                                   | Reason                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Escaping `%` / `_` in admin GET search (`ilike`)** | Admin-only endpoint; `app/api/admin/blog` and `app/api/admin/leads` use the same `query.or(\`...%${search}%\`)` pattern. Changing only deep-research would be inconsistent. Broader admin search hardening (if desired) belongs in a separate PR. |
| **New abstractions beyond shared validation**        | Per Phase 2: no new utility patterns beyond the already-extracted `validateDeepResearchPayload`. Validation extraction was applied; no further abstraction added.                                                                                 |
| **Unit tests for `lib/deep-research/validation.ts`** | Optional follow-up. Validation is used by both POST and PUT; adding tests is reasonable but not required for this merge.                                                                                                                          |

---

## Status

**READY TO MERGE**

- Auth: Admin routes guard with `getServerUser()` and `admin_users` role check.
- Validation: Shared `validateDeepResearchPayload()` used for POST (create) and PUT (update); required fields and 500KB limit enforced.
- Error handling: Supabase errors handled; 23505 (unique slug) mapped to 400 with clear message.
- Types: No `any` in deep-research API or validation; `ValidationResult` and route payload handling are typed.
- No TODOs, FIXMEs, or commented-out blocks left in changed files.
- Revalidation: `revalidatePath` used for `/deep-research`, slug pages, and `/sitemap.xml` on publish/update/delete.

**Recommendation:** Run `npm run test:run` and `npm run build` locally before merging to confirm tests and build pass.
