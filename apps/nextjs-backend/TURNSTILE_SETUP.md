# Cloudflare Turnstile Setup Guide

The Exercise Challenge feature requires Cloudflare Turnstile for spam protection. Follow these steps to set it up:

## Step 1: Create a Cloudflare Account (if you don't have one)

1. Go to [Cloudflare](https://dash.cloudflare.com/sign-up)
2. Sign up for a free account (no credit card required)

## Step 2: Access Turnstile Dashboard

1. Log in to your Cloudflare dashboard
2. Navigate to **Turnstile** in the sidebar (or go directly to: https://dash.cloudflare.com/?to=/:account/turnstile)
3. Click **"Add Site"** or **"Create"**

## Step 3: Configure Your Site

1. **Site name**: Enter a descriptive name (e.g., "AI Workout Generator")
2. **Domain**: Add your domain(s):
   - For local development: `localhost`
   - For production: `aiworkoutgenerator.com` (or your actual domain)
   - You can add multiple domains
3. **Widget mode**: Select **"Managed"** (recommended for most use cases)
4. **Pre-Clearance**: Leave disabled unless you have a specific use case
5. Click **"Create"**

## Step 4: Get Your Keys

After creating the site, you'll see:

- **Site Key** (public) - This is safe to expose in client-side code
- **Secret Key** (private) - This must be kept secret and only used server-side

## Step 5: Add Keys to Environment Variables

Add these to your `.env.local` file:

```bash
# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```

**Important:**

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Must start with `NEXT_PUBLIC_` to be accessible in client-side code
- `TURNSTILE_SECRET_KEY` - Do NOT add `NEXT_PUBLIC_` prefix (this is server-only)

## Step 6: Restart Your Development Server

After adding the environment variables:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 7: Verify It's Working

1. Navigate to `/exercise-challenge` page
2. You should see the Turnstile captcha widget in the lead capture form
3. The error message should no longer appear

## Troubleshooting

### Error: "Captcha configuration error"

- **Cause**: Environment variables not set or not loaded
- **Solution**:
  1. Verify `.env.local` exists in the project root
  2. Check that variable names are exactly correct (case-sensitive)
  3. Restart your dev server after adding variables
  4. For production, add variables in your hosting platform (Vercel, etc.)

### Error: "Invalid site key"

- **Cause**: Site key doesn't match the domain
- **Solution**:
  1. Go to Turnstile dashboard
  2. Verify your domain is added to the site configuration
  3. For localhost, make sure `localhost` is in the domain list

### Captcha not appearing

- **Cause**: Script loading issue or domain mismatch
- **Solution**:
  1. Check browser console for errors
  2. Verify domain is whitelisted in Turnstile dashboard
  3. Try clearing browser cache

## Production Deployment

When deploying to production (e.g., Vercel):

1. Go to your project settings in Vercel
2. Navigate to **Environment Variables**
3. Add both variables:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = your site key
   - `TURNSTILE_SECRET_KEY` = your secret key
4. Make sure to add them for the **Production** environment
5. Redeploy your application

## Additional Resources

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
