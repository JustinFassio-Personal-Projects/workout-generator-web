# Plan: Fix Sentry Issue JAVASCRIPT-NEXTJS-2 (“No such price”)

**Issue:** [JAVASCRIPT-NEXTJS-2](https://ai-workout-generator.sentry.io/issues/JAVASCRIPT-NEXTJS-2) — `No such price: 'price_1SkvWpDE9Z9sX1ecgJuxmzjh'` from `POST /api/stripe/checkout` (3 events).

**Root cause:** Production was using an incorrect/wrong-account Stripe price ID for the Basic tier (`price_1SkvWp...`). The app reads price IDs only from env (`STRIPE_BASIC_PRICE_ID`, etc. in `src/lib/stripe.ts`); there are no hardcoded price IDs in code.

---

## Plan

### 1. Confirm production uses the correct live price IDs

- [ ] **Local:** Verify `.env.local` has the five **live** monthly price IDs (from Stripe with live key):
  - `STRIPE_BASIC_PRICE_ID=price_1SkuxzDSRMHuqcaG5346x8bb`
  - `STRIPE_PRO_PRICE_ID=price_1SkuxFDSRMHuqcaG18uXSi4C`
  - `STRIPE_ELITE_PRICE_ID=price_1SkuxGDSRMHuqcaGT4oPTOci`
  - `STRIPE_COACH_PRICE_ID=price_1SmKeFDSRMHuqcaGzMLsLiqA`
  - `STRIPE_COACH_PRO_PRICE_ID=price_1SmKeNDSRMHuqcaG0PXqaXyT`
- [ ] **App Hosting:** Ensure these same values are in Cloud Secret Manager and the backend has access. If you haven’t already:
  ```bash
  bash scripts/set-apphosting-live-stripe.sh
  firebase apphosting:secrets:grantaccess stripe-secret-key,stripe-publishable-key,stripe-basic-price-id,stripe-pro-price-id,stripe-elite-price-id,stripe-coach-price-id,stripe-coach-pro-price-id,stripe-webhook-secret --backend aiworkoutgenerator-hub
  ```
- [ ] **Redeploy** App Hosting so the running app uses the updated secrets (no code change required).

### 2. Resolve the issue in Sentry

- [ ] Open [JAVASCRIPT-NEXTJS-2](https://ai-workout-generator.sentry.io/issues/JAVASCRIPT-NEXTJS-2).
- [ ] **Resolve** the issue (e.g. “Resolve” button).
- [ ] Optional: add a **resolution note**, e.g.  
       `Fixed by updating production Stripe price ID secrets to correct live price IDs (Basic/Pro/Elite/Coach/Coach Pro). Old ID price_1SkvWp... was from wrong account; app now uses env-driven IDs from set-apphosting-live-stripe.sh.`

No code change is required to “fix” this issue; it was a configuration problem. After step 1, new checkouts will use the correct price IDs and the error will not recur. Step 2 is housekeeping so the issue no longer appears as unresolved.

### 3. Optional: doc cleanup

- [ ] If `docs/STRIPE_VERIFICATION_REPORT.md` still refers to `price_1SkvWp...` as the live Basic ID, update or remove that line (the correct live Basic ID is `price_1Skuxz...`).

---

## Summary

| Step | Action                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------- |
| 1    | Confirm .env.local and App Hosting secrets use the five correct live price IDs; redeploy if needed. |
| 2    | Resolve JAVASCRIPT-NEXTJS-2 in Sentry and optionally add a resolution note.                         |
| 3    | (Optional) Update STRIPE_VERIFICATION_REPORT.md if it mentions the old ID.                          |

After step 1, the error is fixed for production. After step 2, Sentry reflects that the issue is resolved.
