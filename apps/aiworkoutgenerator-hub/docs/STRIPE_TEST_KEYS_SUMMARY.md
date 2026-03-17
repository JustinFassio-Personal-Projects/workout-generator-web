# Stripe Test Mode Keys - Quick Reference

## Your Stripe Account

- **Account ID**: `acct_1SjMlnDSRMHuqcaG`
- **Account Name**: AI Workout Generator
- **API Keys Dashboard**: https://dashboard.stripe.com/acct_1SjMlnDSRMHuqcaG/apikeys

## Currently Configured Products & Prices

Based on your Stripe account, here are your subscription products:

### Products Found:

1. **Basic Subscription** - $5.99/month
   - Product ID: `prod_TiLft7xef3gCBm`
   - Price ID: `price_1SkuxzDSRMHuqcaG5346x8bb` (amount: $5.99)

2. **Pro Subscription** - $19.00/month
   - Product ID: `prod_TiLfgYIPvbhLAj`
   - Price ID: `price_1SkuyEDSRMHuqcaGsFFcils0` (amount: $19.00)

3. **Elite Subscription** - $49.00/month
   - Product ID: `prod_TiLf7mTC43GYfL`
   - Price ID: `price_1SkuyGDSRMHuqcaGVugd9vSS` (amount: $49.00)

4. **Coach** - $99.00/month
   - Product ID: `prod_TjoGkoYlJ9mpSj`
   - Price ID: `price_1SmKeFDSRMHuqcaGzMLsLiqA` (amount: $99.00)

5. **Coach Pro** - $199.00/month
   - Product ID: `prod_TjoGGqnJ32OlVw`
   - Price ID: `price_1SmKeNDSRMHuqcaG0PXqaXyT` (amount: $199.00)

⚠️ **Note**: These price IDs may be from live mode. You'll need **test mode** price IDs for development.

## Required Environment Variables for Test Mode

Add these to your `.env.local` file:

```bash
# Stripe Test Mode Secret Key (get from dashboard)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE

# Stripe Test Mode Publishable Key (get from dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE

# Stripe Test Mode Price IDs (get from dashboard while in test mode)
STRIPE_BASIC_PRICE_ID=price_YOUR_TEST_BASIC_PRICE_ID
STRIPE_PRO_PRICE_ID=price_YOUR_TEST_PRO_PRICE_ID
STRIPE_ELITE_PRICE_ID=price_YOUR_TEST_ELITE_PRICE_ID
STRIPE_COACH_PRICE_ID=price_YOUR_TEST_COACH_PRICE_ID
STRIPE_COACH_PRO_PRICE_ID=price_YOUR_TEST_COACH_PRO_PRICE_ID
```

## How to Get Test Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/acct_1SjMlnDSRMHuqcaG/apikeys

2. **Toggle to Test Mode**:
   - Click the toggle in the top-right corner (next to your account name)
   - Make sure it says **"Test mode"** (not "Live mode")

3. **Copy API Keys**:
   - **Publishable key**: Starts with `pk_test_...` (visible)
   - **Secret key**: Starts with `sk_test_...` (click "Reveal test key")

4. **Get Test Price IDs**:
   - Navigate to **Products** (while in Test mode)
   - For each product above, click on it
   - Go to **Pricing** tab
   - Copy the **Price ID** (starts with `price_...`)
   - ⚠️ These will be DIFFERENT from the live mode price IDs shown above

## After Setup

1. Update `.env.local` with your test keys
2. Restart your dev server
3. You should see: `✅ Stripe test mode enabled in development`
