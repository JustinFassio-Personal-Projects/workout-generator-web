# Phase 2: App-Side Stripe Note (Premium Tier $11.99)

**Audience:** App team (app.aiworkoutgenerator.com)  
**Context:** [REVERSE_TRIAL_ROADMAP.md](REVERSE_TRIAL_ROADMAP.md) Phase 2 — Free tier removed; **Premium** $11.99 is the entry tier (replaces Basic $5.99).

## Summary

- **Premium:** $11.99/month — entry tier (20 AI-generated workouts/month, etc.).
- **Legacy Basic:** $5.99/month — if any existing Basic subscribers remain, grandfather them; both can map to the same access tier for app logic.

## What the app must do

Map the $11.99 Premium price (and legacy $5.99 Basic if applicable) to one **subscription tier** for access control:

- **If the app maps by `price_id`:** Add the $11.99 Premium price ID to the set that maps to `subscription_tier: 'premium'` (or `'basic'` for backward compatibility). Keep legacy $5.99 price ID mapped if you have existing Basic subscribers.
- **If the app maps by product ID or product metadata:** Map the Premium product/price so users get the same features and limits (e.g., 20 AI-generated workouts/month).

---

## Landing / Marketing sites (nextjs-backend, astro-site, programs)

Pricing CTAs use **Stripe Payment Link URLs** (e.g. `https://buy.stripe.com/...`). Default Premium link: `https://buy.stripe.com/dRm6oHcW3gW19RZ6qlgnK00`. Env vars:

- **nextjs-backend:** `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM`
- **astro-site / programs:** `PUBLIC_STRIPE_PAYMENT_LINK_PREMIUM`

When unset: in **production** all three use the default Premium link above; in development/staging they fall back to the app login URL to avoid accidental live checkout. If you only have a Stripe product/price ID: create a [Payment Link](https://dashboard.stripe.com/payment-links) and put the **link URL** in the env var.
