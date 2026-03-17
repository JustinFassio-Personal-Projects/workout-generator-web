# Stripe price IDs (from Stripe CLI)

Run from project root with `STRIPE_SECRET_KEY` in `.env.local`:

```bash
source .env.local
stripe products list --limit 20
stripe prices list --limit 50
```

Match each product name to the price with `recurring.interval === "month"` and `active === true`.

## Current mapping (from CLI)

Product names and their **monthly recurring** price IDs (one per tier):

| Tier      | Product ID          | Price ID (monthly, active)     |
| --------- | ------------------- | ------------------------------ |
| Basic     | prod_TvqFMhfxlhxtbm | price_1SxyYxDSRMHuqcaGZKm3ugyy |
| Pro       | prod_TvqFazzpV6diMw | price_1SxyYyDSRMHuqcaGzQC1pdOs |
| Elite     | prod_TvqFDx9MejR8bs | price_1SxyYzDSRMHuqcaGwyRwRt4T |
| Coach     | prod_TvqFXPZm1mvoFr | price_1SxyZ0DSRMHuqcaGmdib21M5 |
| Coach Pro | prod_TvqFTDnPDyiWFq | price_1SxyZ1DSRMHuqcaGZyQVJ7k5 |

**Mode:** If the CLI was run with `sk_test_...` in `.env.local`, these are **test** price IDs. For **production** you must use **live** price IDs: put `STRIPE_SECRET_KEY=sk_live_...` in `.env.local`, run the same `stripe products list` and `stripe prices list`, and copy the five price IDs that have `"livemode": true` for Basic, Pro, Elite, Coach, Coach Pro. Then set those in App Hosting (e.g. via `bash scripts/set-apphosting-live-stripe.sh`) and redeploy.

## Env vars for app

```
STRIPE_BASIC_PRICE_ID=price_1SxyYxDSRMHuqcaGZKm3ugyy
STRIPE_PRO_PRICE_ID=price_1SxyYyDSRMHuqcaGzQC1pdOs
STRIPE_ELITE_PRICE_ID=price_1SxyYzDSRMHuqcaGwyRwRt4T
STRIPE_COACH_PRICE_ID=price_1SxyZ0DSRMHuqcaGmdib21M5
STRIPE_COACH_PRO_PRICE_ID=price_1SxyZ1DSRMHuqcaGZyQVJ7k5
```

Use these for **test** mode. For **live**, replace with the IDs from Stripe Dashboard (Live) or from the CLI when using a live key.
