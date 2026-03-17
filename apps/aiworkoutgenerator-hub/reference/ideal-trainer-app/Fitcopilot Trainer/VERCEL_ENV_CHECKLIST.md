# Vercel Environment Variables Checklist

This checklist ensures all required environment variables are properly configured in Vercel for production deployment.

## Required Environment Variables

Access: Vercel Dashboard → Your Project → Settings → Environment Variables

### ✅ Checklist

- [ ] **VITE_SUPABASE_URL**
  - Value: `https://tknkxfeyftgeicuosrhi.supabase.co`
  - Description: Production Supabase project URL
  - Required for: Database connectivity

- [ ] **VITE_SUPABASE_KEY**
  - Value: Your production Supabase anon key
  - Description: Public anonymous key for client-side Supabase operations
  - Required for: Database authentication and queries
  - Security: Safe to expose in client-side code (limited permissions)

- [ ] **VITE_SUPABASE_JWT_SECRET**
  - Value: Your Supabase JWT secret
  - Description: Secret key for verifying SSO tokens from Hub
  - Required for: SSO token validation
  - Security: This is the JWT secret from Supabase project settings
  - Location in Supabase: Settings → API → JWT Secret

- [ ] **VITE_GEMINI_API_KEY**
  - Value: Your Google Gemini API key
  - Description: API key for AI workout generation
  - Required for: Workout generation functionality
  - Format: `AIzaSy...`

## How to Verify

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Trainer project (fitcopilot-trainer)
3. Navigate to Settings → Environment Variables
4. Verify each variable is present and correctly set
5. Ensure variables are enabled for Production environment

## After Updating

If you add or modify any environment variables:

1. **Redeploy Required**: Changes to environment variables require a new deployment
2. **Trigger Redeploy**:
   - Option A: Push a new commit to trigger automatic deployment
   - Option B: Use Vercel dashboard → Deployments → Redeploy

## Security Notes

- ✅ **VITE_SUPABASE_KEY (anon key)**: Safe in client code, has limited RLS-protected access
- ❌ **VITE_SUPABASE_JWT_SECRET**: While used client-side for verification, ensure it's the same secret used by Hub for signing tokens
- ❌ **Service Role Key**: NEVER add the service role key to environment variables (it's not needed and would be a security risk)

## Troubleshooting

**Issue**: Variables are set but not working

- **Solution**: Redeploy the application after setting/changing variables

**Issue**: Getting "env variable not defined" errors

- **Solution**: Check that variable names match exactly (case-sensitive)

**Issue**: Database connection fails

- **Solution**: Verify VITE_SUPABASE_URL and VITE_SUPABASE_KEY match your production Supabase project

## Post-Deployment Verification

After deploying with correct environment variables, check production console:

```
✅ Supabase initialized connected to: https://tknkxfeyftgeicuosrhi.supabase.co
```

If you see this message, environment variables are correctly configured.
