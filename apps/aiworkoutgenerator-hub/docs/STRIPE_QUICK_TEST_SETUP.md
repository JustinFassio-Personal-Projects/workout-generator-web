# Stripe Test Mode Quick Setup Helper

Quick reference for setting up Stripe test mode keys.

## Your Stripe Account

Navigate to your Stripe Dashboard: https://dashboard.stripe.com/apikeys

## Steps to Get Test Keys

1. Go to the API keys link above (or navigate to Developers > API keys in your Stripe dashboard)
2. Toggle **Test mode** ON (top right corner)
3. Copy the test keys (`pk_test_...` and `sk_test_...`)
4. Get test price IDs from Products (while in test mode)

## Add These to `.env.local`

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_BASIC_PRICE_ID=price_YOUR_BASIC_PRICE_ID
STRIPE_PRO_PRICE_ID=price_YOUR_PRO_PRICE_ID
STRIPE_ELITE_PRICE_ID=price_YOUR_ELITE_PRICE_ID
STRIPE_COACH_PRICE_ID=price_YOUR_COACH_PRICE_ID
STRIPE_COACH_PRO_PRICE_ID=price_YOUR_COACH_PRO_PRICE_ID
```

## After Updating `.env.local`

Restart your dev server for the changes to take effect.
