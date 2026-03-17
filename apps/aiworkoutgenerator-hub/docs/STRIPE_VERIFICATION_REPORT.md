# Stripe configuration verification report

Generated using Stripe CLI (same credentials the Stripe MCP uses via `scripts/run-stripe-mcp.sh` and `.env.local`).

## Summary

| Check                                       | Result                                     |
| ------------------------------------------- | ------------------------------------------ |
| **Key in .env.local**                       | `sk_test_...` (test mode)                  |
| **Price IDs in .env.local**                 | 5 set: Basic, Pro, Elite, Coach, Coach Pro |
| **Do those price IDs exist with test key?** | **No** – all 5 return "No such price"      |

## Conclusion

The five price IDs in your env (`price_1SkvWp...`, `price_1SktXE...`, `price_1SktXF...`, `price_1SmKeF...`, `price_1SmKeN...`) are **live-mode** prices. They do not exist when using a **test** secret key.

- **Production:** Must use **live** secret key (`sk_live_...`) and these **live** price IDs. If the backend was using a test key, Stripe returns "No such price" and the app shows "You are using test mode keys...".
- **Local / preview:** Use **test** key and **test** price IDs from Stripe Dashboard (Test mode). Create test products/prices if needed, or use a separate .env for test.

## How to verify

### 1. Stripe CLI (and MCP)

From project root with `STRIPE_SECRET_KEY` in `.env.local`:

```bash
bash scripts/verify-stripe-config.sh
```

- With **test** key: script will report the 5 env price IDs as NOT FOUND (they are live).
- With **live** key: set `STRIPE_SECRET_KEY=sk_live_...` in `.env.local`, run the script again; all 5 should be reported as found (livemode=true).

### 2. Stripe MCP

The Stripe MCP uses the same `STRIPE_SECRET_KEY` from `.env.local` (see `scripts/run-stripe-mcp.sh`). With a **live** key loaded:

- Ask the AI to use the Stripe MCP to **list prices** or **list products and prices**.
- Confirm the Basic, Pro, Elite, Coach, and Coach Pro price IDs match the values in your App Hosting secrets and in `.env.local` for production.

### 3. Production (App Hosting)

- Set **stripe-secret-key** to your **live** key:  
  `echo -n "sk_live_YOUR_KEY" | firebase apphosting:secrets:set stripe-secret-key --data-file - --force`
- Set the five price ID secrets to the **live** price IDs (from Dashboard → Live mode).
- Redeploy the backend so it picks up the new secrets.

## Script

`scripts/verify-stripe-config.sh` – loads `.env.local`, detects key mode (test/live), and checks each of the five price IDs against the Stripe API. Use it after changing keys or price IDs to confirm configuration.
