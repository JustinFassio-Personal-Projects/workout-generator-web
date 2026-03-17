# Stripe Test Mode Setup for Development

This guide explains how to switch your Stripe integration to test mode for safe development testing.

## Quick Setup

### Step 1: Get Test Mode API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/acct_1SjMlnDSRMHuqcaG/apikeys)
2. **IMPORTANT**: Toggle **"Test mode"** in the top right corner of the dashboard (next to your account name)
3. Navigate to **Developers** > **API keys**
4. Copy these keys:
   - **Publishable key**: Starts with `pk_test_...`
   - **Secret key**: Starts with `sk_test_...` (click "Reveal test key" if hidden)

### Step 2: Get Test Mode Price IDs

1. With **Test mode** toggle ON in Stripe Dashboard
2. Navigate to **Products**
3. For each subscription tier (Basic, Pro, Elite, Coach, Coach Pro):
   - Click on the product
   - Go to **Pricing** section
   - Copy the **Price ID** (starts with `price_...`)
   - **Note**: Test mode price IDs are different from live mode price IDs

### Step 3: Update Environment Variables

Create or update `.env.local` in the project root:

```bash
# Stripe Test Mode Keys (for development)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE

# Stripe Test Mode Price IDs
STRIPE_BASIC_PRICE_ID=price_YOUR_TEST_BASIC_PRICE_ID
STRIPE_PRO_PRICE_ID=price_YOUR_TEST_PRO_PRICE_ID
STRIPE_ELITE_PRICE_ID=price_YOUR_TEST_ELITE_PRICE_ID
STRIPE_COACH_PRICE_ID=price_YOUR_TEST_COACH_PRICE_ID
STRIPE_COACH_PRO_PRICE_ID=price_YOUR_TEST_COACH_PRO_PRICE_ID

# Webhook secret for local testing (REQUIRED for subscriptions to work)
# Option 1: Use Stripe CLI (Recommended for local dev)
# Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook secret (whsec_...) shown and add it here:
# STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_CLI_WEBHOOK_SECRET

# Option 2: Use test mode webhook from Stripe Dashboard
# 1. Go to Stripe Dashboard > Developers > Webhooks (with Test mode ON)
# 2. Create or select a webhook endpoint pointing to your local URL
# 3. Copy the "Signing secret" (whsec_...)
# STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET
```

### Step 4: Restart Dev Server

After updating `.env.local`, restart your Next.js dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Verification

After setup, you should see in your console logs:

```
✅ Stripe test mode enabled in development
```

If you see a warning like:

```
⚠️  Stripe LIVE keys detected in development! Switch to test mode for safe testing.
```

Then your keys are still in live mode - double-check that you:

1. Toggled "Test mode" in Stripe Dashboard
2. Copied the test keys (starting with `sk_test_` and `pk_test_`)
3. Restarted the dev server after updating `.env.local`

## Test Mode Benefits

- ✅ Safe testing without real charges
- ✅ Test cards work (see Stripe docs for test card numbers)
- ✅ No impact on production data
- ✅ Full Stripe API functionality in sandbox

## Test Card Numbers

Use these test card numbers in Stripe Checkout for testing:

- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 0002`

Any future expiry date and any 3-digit CVC will work with test cards.

## Important Notes

⚠️ **Never commit `.env.local` to git** - it's already in `.gitignore`

⚠️ **Test mode keys are different from live mode keys** - make sure you're using the correct set

⚠️ **Price IDs are different in test vs live mode** - you need separate price IDs for each mode

## Webhook Setup for Local Testing

**IMPORTANT**: For subscriptions to work locally, you need to configure webhooks. Without webhooks, checkout will complete but the subscription won't be applied to the user.

**For local development, you MUST use Stripe CLI** - Stripe Dashboard webhooks require a publicly accessible URL and won't work with `localhost`. Stripe CLI is the recommended and easiest method for local testing.

### Using Stripe CLI (Required for Local Development)

1. **Install Stripe CLI** (if not already installed):
   - macOS: `brew install stripe/stripe-cli/stripe`
   - Other platforms: https://stripe.com/docs/stripe-cli

2. **Login to Stripe CLI**:

   ```bash
   stripe login
   ```

   This opens your browser to authenticate with your Stripe account.

3. **In a separate terminal window**, start webhook forwarding:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   ⚠️ **Keep this terminal window open** - the command must keep running.

4. **Copy the webhook secret** shown in the output:

   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
   ```

5. **Add it to `.env.local`**:

   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

6. **Restart your dev server** to pick up the new environment variable.

📝 **See `docs/STRIPE_WEBHOOK_SETUP.md` for detailed instructions and troubleshooting.**

## Troubleshooting

### Subscriptions not applying to user?

If checkout completes but the subscription doesn't appear:

1. Check that `STRIPE_WEBHOOK_SECRET` is set in `.env.local`
2. Verify the webhook secret matches your Stripe mode (test vs live)
3. Check server logs for webhook errors
4. If using Stripe CLI, make sure `stripe listen` is running
5. Verify webhook events are being received (check Stripe Dashboard > Webhooks > Events)

### Still seeing live mode errors?

1. Check your `.env.local` file exists and has the correct variable names
2. Verify keys start with `sk_test_` and `pk_test_` (not `sk_live_` or `pk_live_`)
3. Restart the dev server completely
4. Clear your browser cache and reload

### Can't find test mode toggle?

1. Make sure you're logged into the correct Stripe account
2. The toggle is in the top-right corner next to your account name
3. It should say "Test mode" when toggled ON

### Price ID errors?

1. Make sure you copied price IDs while "Test mode" is ON
2. Test mode price IDs are different from live mode price IDs
3. Verify the prices are marked as "Active" in your Stripe Dashboard
