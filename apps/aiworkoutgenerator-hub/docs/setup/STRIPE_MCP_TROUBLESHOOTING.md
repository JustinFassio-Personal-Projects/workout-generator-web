# Stripe MCP – Connection Fix

The **hosted** Stripe MCP (`https://mcp.stripe.com`) uses OAuth and often fails to connect in Cursor (no reliable browser login flow). This project uses the **local** Stripe MCP instead, so it connects using your existing Stripe key with no OAuth.

## What’s configured

1. **`.cursor/mcp.json`** – Stripe is set up to run via a local script:
   - `"command": "bash"`
   - `"args": ["scripts/run-stripe-mcp.sh"]`

2. **`scripts/run-stripe-mcp.sh`** – Loads `STRIPE_SECRET_KEY` from **`.env.local`** and runs `npx @stripe/mcp --tools=all`. Your key never goes into `mcp.json`.

## What you need

- **`STRIPE_SECRET_KEY`** in `.env.local` (you already have this for the app).

If it’s missing, add it:

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...   # from https://dashboard.stripe.com/apikeys
```

## If it still doesn’t connect

1. **Restart Cursor**  
   Fully quit and reopen the project so it reloads MCP config.

2. **Check Cursor MCP status**  
   **Cursor → Settings → Features → Model Context Protocol**. Find “stripe” and see if there’s an error (e.g. “script not found” or “exit code 1”).

3. **Run the script by hand** (from project root):

   ```bash
   bash scripts/run-stripe-mcp.sh
   ```

   - If you see `STRIPE_SECRET_KEY is not set`, add it to `.env.local`.
   - If you see `✅ Stripe MCP Server running on stdio`, the script is fine; the issue is Cursor not finding the script (e.g. wrong cwd). Open the project as the **root workspace folder** (not a parent folder).

4. **Use an absolute path** (if Cursor runs from another directory):  
   In `.cursor/mcp.json`, change the stripe server to:
   ```json
   "stripe": {
     "command": "/bin/bash",
     "args": ["/FULL/PATH/TO/aiworkoutgenerator-hub/scripts/run-stripe-mcp.sh"]
   }
   ```
   Replace `/FULL/PATH/TO/aiworkoutgenerator-hub` with your real project path.

## Why not the hosted URL?

Stripe’s hosted MCP at `https://mcp.stripe.com` requires you to “manage MCP client sessions” in the Stripe Dashboard and sign in via OAuth. In Cursor that flow often never completes, so the server stays in “needs authentication.” Using the local MCP with `STRIPE_SECRET_KEY` from `.env.local` avoids OAuth and connects reliably.

---

## Investigating "Price ID not found" / "You are using test mode keys"

When production shows this error, the **backend** is either using **test** Stripe keys (`sk_test_...`) or the **price IDs** in App Hosting secrets don't exist in the Stripe account (wrong mode or typo).

### 1. Confirm what the server is using

After deploying the fix that returns `details` in the checkout API error (branch `fix/stripe-live-pricing-docs`), trigger checkout again and check the browser console. Look for a log like:

- `"Checkout API error details"` with `details: { stripeMode: "test" | "live", tier, ... }`

If `stripeMode` is `"test"`, the production backend's `STRIPE_SECRET_KEY` is still a test key. Update the **stripe-secret-key** secret to your live key and redeploy.

### 2. Use the Stripe MCP to verify prices

With the Stripe MCP connected (using the **same** key type you intend in production):

1. **Live mode:** Put `STRIPE_SECRET_KEY=sk_live_...` in `.env.local`, restart Cursor so the MCP uses it, then ask the AI to use the Stripe MCP to **list prices** (e.g. "list Stripe prices" or "list products and their prices").
2. Compare the returned **Price IDs** (e.g. for Basic) with the value in your App Hosting secret **stripe-basic-price-id**. They must match exactly and come from the same Stripe mode (live key → live price IDs).
3. **Test mode:** Use `sk_test_...` in `.env.local` and list prices again to see test price IDs (for local/preview only).

### 3. Quick checklist

| Check       | Action                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Backend key | Ensure **stripe-secret-key** in App Hosting is `sk_live_...` for production and redeploy.                            |
| Price IDs   | Set **stripe-basic-price-id** (and other tier secrets) to the IDs from Stripe Dashboard **Live** mode.               |
| Console     | After deploying the checkout error-details fix, use `details.stripeMode` in the console to confirm the backend mode. |
