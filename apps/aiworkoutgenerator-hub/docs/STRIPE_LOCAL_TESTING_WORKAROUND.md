# Stripe Local Testing Workaround

## Problem

Stripe CLI `stripe listen` is not forwarding webhooks to the local endpoint, preventing local testing of subscription functionality.

## Root Cause

Stripe CLI forwarding tunnel is broken. This is a Stripe CLI infrastructure issue, not a code bug.

Evidence:

- Checkout sessions are created successfully
- Webhook endpoint receives zero requests
- `stripe listen` shows no forwarded events
- Production webhooks work correctly

## Workarounds

### Option 1: Update Stripe CLI (Recommended)

```bash
# Update Stripe CLI to latest version
brew upgrade stripe/stripe-cli/stripe

# Restart stripe listen
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

### Option 2: Use Stripe Dashboard Webhooks (Requires ngrok)

1. Install ngrok: `brew install ngrok`
2. Start ngrok: `ngrok http 3000`
3. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
4. In Stripe Dashboard → Developers → Webhooks
5. Add endpoint: `https://abc123.ngrok.io/api/webhooks/stripe`
6. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
7. Copy the webhook signing secret
8. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Option 3: Test in Production Test Mode

Since production works, you can test using:

- Test mode API keys
- Production webhook endpoint (configured in Stripe Dashboard)
- Test cards in production environment

### Option 4: Manual Verification (Current State)

For now, checkout sessions are created successfully. Subscription activation relies on webhooks, so without webhook forwarding:

- Checkout completes successfully
- User is redirected to dashboard
- Subscription is NOT activated (requires webhook)
- Subscription will activate once webhooks work (e.g., in production)

## Verification

Once webhook forwarding is working, you should see:

1. Events in `stripe listen` terminal
2. POST requests to `/api/webhooks/stripe` in server logs
3. Subscription activated in user account after checkout

## Current Status

✅ Checkout session creation: Working
✅ Webhook handler code: Working (production confirms)
❌ Stripe CLI forwarding: Broken (infrastructure issue)
