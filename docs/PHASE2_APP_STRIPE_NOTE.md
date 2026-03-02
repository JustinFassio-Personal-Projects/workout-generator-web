# Phase 2: App-Side Stripe Note (Basic Tier $11.99)

**Audience:** App team (app.aiworkoutgenerator.com)  
**Context:** [REVERSE_TRIAL_ROADMAP.md](REVERSE_TRIAL_ROADMAP.md) Phase 2 — Basic tier price changed from $5.99 to $11.99.

## Summary

The Basic tier now has **two Stripe prices**:

- **Legacy:** $5.99/month — existing Basic subscribers (grandfathered).
- **New:** $11.99/month — all new Basic signups.

## What the app must do

Both prices must resolve to the same **subscription tier** for access control:

- **If the app maps by `price_id`:** Add the new $11.99 Basic price ID to the set of IDs that map to `subscription_tier: 'basic'` (or equivalent). Do not remove the legacy $5.99 price ID; existing subscribers use it.
- **If the app maps by product ID or product metadata:** No change needed, as both prices belong to the same Basic product.

Verify that users on either Basic price receive the same features and limits (e.g., 20 AI-generated workouts/month or whatever the Basic tier grants).

---

## Landing / Marketing sites (nextjs-backend, astro-site)

Pricing CTAs use **Stripe Payment Link URLs** (e.g. `https://buy.stripe.com/...`), not product IDs. Env vars:

- **nextjs-backend:** `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_BASIC` or `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM` (Premium takes precedence; both map to the Basic $11.99 tier CTA).
- **astro-site:** `PUBLIC_STRIPE_PAYMENT_LINK_BASIC` or `PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM` (Premium takes precedence; both map to the Basic $11.99 tier CTA).

If you only have a Stripe product/price ID: create a [Payment Link](https://dashboard.stripe.com/payment-links) for that price and put the **link URL** in the env var.
