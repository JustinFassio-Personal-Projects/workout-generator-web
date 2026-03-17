# Stripe Webhook Setup for Local Development

This guide explains how to set up Stripe webhooks for local testing using Stripe CLI.

## Quick Start

### Step 1: Ensure Stripe CLI is Installed

Check if Stripe CLI is installed:

```bash
stripe --version
```

If not installed, install it:

- macOS: `brew install stripe/stripe-cli/stripe`
- Other platforms: https://stripe.com/docs/stripe-cli

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate. Make sure you're logged into the same Stripe account you're using for development.

### Step 3: Start Webhook Forwarding

In a **separate terminal window** (keep your dev server running), run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

You should see output like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 4: Copy the Webhook Secret

Copy the webhook secret that starts with `whsec_...` from the output above.

### Step 5: Add to .env.local

Add the webhook secret to your `.env.local` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

### Step 6: Restart Dev Server

Restart your Next.js dev server to pick up the new environment variable:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Verification

After setup:

1. **Keep Stripe CLI running**: The `stripe listen` command must stay running in a separate terminal
2. **Keep dev server running**: Your Next.js dev server should be running on port 3000
3. **Test a subscription**: Complete a test checkout and verify the subscription is applied to the user

## Troubleshooting

### "STRIPE_WEBHOOK_SECRET not configured" error

- Make sure `STRIPE_WEBHOOK_SECRET` is set in `.env.local`
- Restart your dev server after adding the secret
- Verify the secret starts with `whsec_`

### "Invalid webhook signature" error

- Make sure `stripe listen` is still running
- Use the webhook secret from the current `stripe listen` session (it changes each time)
- Make sure you're using test mode keys with test mode webhooks

### Webhooks not being received

- Check that `stripe listen` is running
- Verify the URL in `stripe listen` matches your dev server URL (localhost:3000)
- Check that your dev server is running on port 3000
- Look for errors in both the Stripe CLI output and your server logs

### Subscription not applied after checkout

- Check server logs for webhook errors
- Verify the webhook secret is correct
- Make sure `stripe listen` is running and receiving events
- Check that your Stripe keys are in test mode

## Important Notes

- ⚠️ **Keep `stripe listen` running**: You need to keep the Stripe CLI forwarding command running while testing
- ⚠️ **Webhook secret changes**: The webhook secret shown by `stripe listen` is unique to that session. If you restart `stripe listen`, you'll need to update `.env.local` with the new secret
- ⚠️ **Test mode only**: Make sure you're using test mode Stripe keys when using Stripe CLI for local development
- ⚠️ **Port 3000**: The default dev server runs on port 3000. If you use a different port, update the `--forward-to` URL accordingly
