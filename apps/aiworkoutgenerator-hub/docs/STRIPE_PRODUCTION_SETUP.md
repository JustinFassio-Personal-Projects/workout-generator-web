# Stripe Production Setup Troubleshooting

## Issue

Stripe checkout is returning a 503 error in production with the message:

```
Error: Stripe is not configured. Subscriptions are unavailable.
```

## Root Cause

The Stripe environment variables are not configured in Firebase App Hosting. The `apphosting.yaml` file has been updated to include Stripe configuration, but the secrets need to be created in Cloud Secret Manager.

## Solution

### Step 1: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** > **API keys**
3. Copy your **Secret key** (starts with `sk_live_...` for production or `sk_test_...` for testing)

### Step 2: Get Your Stripe Price IDs

1. Switch the Stripe Dashboard to **Live** mode (toggle in the header). Copy the Price IDs from Products so production uses live pricing.
2. In Stripe Dashboard, go to **Products**
3. For each subscription tier (Basic, Pro, Elite, Coach, Coach Pro):
   - Click on the product
   - Go to the **Pricing** section
   - Copy the **Price ID** (starts with `price_...`)
   - Make sure you're using the **active** price ID

### Step 3: Get Your Stripe Webhook Secret (Optional)

If you have webhooks configured:

1. Go to **Developers** > **Webhooks**
2. Click on your webhook endpoint
3. Copy the **Signing secret** (starts with `whsec_...`)

### Step 4: Create Secrets in Cloud Secret Manager

Run these commands to create the secrets (replace the placeholder values):

```bash
# Set Stripe Secret Key
echo -n "sk_live_YOUR_SECRET_KEY_HERE" | firebase apphosting:secrets:set stripe-secret-key --data-file - --force

# Set Stripe Basic Price ID
echo -n "price_YOUR_BASIC_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-basic-price-id --data-file - --force

# Set Stripe Pro Price ID
echo -n "price_YOUR_PRO_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-pro-price-id --data-file - --force

# Set Stripe Elite Price ID
echo -n "price_YOUR_ELITE_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-elite-price-id --data-file - --force

# Set Stripe Coach Price ID
echo -n "price_YOUR_COACH_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-coach-price-id --data-file - --force

# Set Stripe Coach Pro Price ID
echo -n "price_YOUR_COACH_PRO_PRICE_ID_HERE" | firebase apphosting:secrets:set stripe-coach-pro-price-id --data-file - --force

# Set Stripe Webhook Secret (optional)
echo -n "whsec_YOUR_WEBHOOK_SECRET_HERE" | firebase apphosting:secrets:set stripe-webhook-secret --data-file - --force
```

The `--force` flag automatically:

- Creates the secret in Cloud Secret Manager
- Grants necessary permissions to the App Hosting service account
- Adds the secret reference to `apphosting.yaml` (if not already present)

### Step 5: Verify apphosting.yaml

After running the commands, verify that `apphosting.yaml` includes the Stripe configuration:

```yaml
env:
  # ... other variables ...

  # Stripe configuration
  - variable: STRIPE_SECRET_KEY
    secret: stripe-secret-key

  - variable: STRIPE_BASIC_PRICE_ID
    secret: stripe-basic-price-id

  - variable: STRIPE_PRO_PRICE_ID
    secret: stripe-pro-price-id

  - variable: STRIPE_ELITE_PRICE_ID
    secret: stripe-elite-price-id

  - variable: STRIPE_COACH_PRICE_ID
    secret: stripe-coach-price-id

  - variable: STRIPE_COACH_PRO_PRICE_ID
    secret: stripe-coach-pro-price-id

  - variable: STRIPE_WEBHOOK_SECRET
    secret: stripe-webhook-secret
```

### Step 6: Deploy

1. Commit the updated `apphosting.yaml` file (it only contains secret references, not actual values)
2. Push to your main branch
3. App Hosting will automatically use the secrets during the next deployment

### Step 7: Verify

After deployment, test the Stripe checkout:

1. Go to your production site
2. Navigate to the pricing page
3. Try to subscribe to a plan
4. You should be redirected to Stripe Checkout (not see a 503 error)

## Important Notes

### Test vs Live Keys

- **Development/Testing**: Use `sk_test_...` keys
- **Production**: Use `sk_live_...` keys

Make sure you're using the correct keys for your environment.

### Price IDs

- Price IDs are unique to each Stripe account
- Make sure you're using the **active** price IDs
- Price IDs are different for test and live modes

### Security

- ✅ **apphosting.yaml** contains only secret references (safe to commit)
- ✅ Actual secret values are stored in Cloud Secret Manager
- ✅ Secrets are automatically available at BUILD and RUNTIME
- ⚠️ Never commit actual secret values to git

## Troubleshooting

### Still Getting 503 Error?

1. **Verify secrets exist:**

   ```bash
   firebase apphosting:secrets:list
   ```

   You should see all the Stripe secrets listed.

2. **Check secret values:**

   ```bash
   firebase apphosting:secrets:get stripe-secret-key
   ```

   Verify the value is correct (starts with `sk_live_...` or `sk_test_...`)

3. **Verify apphosting.yaml:**
   - Make sure all Stripe variables are listed
   - Make sure secret names match exactly

4. **Redeploy:**
   - After creating/updating secrets, you need to redeploy for changes to take effect
   - Push a new commit or trigger a manual deployment

### Common Issues

**Issue**: "Secret not found"

- **Solution**: Make sure you created the secret using `firebase apphosting:secrets:set` with the `--force` flag

**Issue**: "Price ID not found" error

- **Solution**: Verify the price IDs are correct and active in your Stripe Dashboard

**Issue**: "Invalid API key" error

- **Solution**: Make sure you're using the correct key (test vs live) and it hasn't been rotated

## Additional Resources

- [Stripe API Keys Documentation](https://stripe.com/docs/keys)
- [Stripe Products and Prices](https://stripe.com/docs/products-prices/overview)
- [Firebase App Hosting Secrets](https://firebase.google.com/docs/app-hosting/manage-secrets)
