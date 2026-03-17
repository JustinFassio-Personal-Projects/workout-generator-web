# Firebase: set production to live Stripe

Production (App Hosting) uses secrets from Firebase. To point production at **live** Stripe:

## 1. Put live keys and price IDs in `.env.local`

Set in `.env.local` (never commit this file):

- `STRIPE_SECRET_KEY` = your live secret key (`sk_live_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = your live publishable key (`pk_live_...`)
- `STRIPE_BASIC_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`, `STRIPE_COACH_PRICE_ID`, `STRIPE_COACH_PRO_PRICE_ID` = your live price IDs from Stripe Dashboard (Live mode).

## 2. Set App Hosting secrets via script

From project root, with Firebase CLI logged in and project selected:

```bash
bash scripts/set-apphosting-live-stripe.sh
```

The script reads from `.env.local` and runs `firebase apphosting:secrets:set` for all seven Stripe secrets. No keys go in the repo or in docs.

## 3. Redeploy

Trigger a new App Hosting deployment so the backend picks up the new secret versions (push a commit or deploy from Firebase Console → App Hosting).
