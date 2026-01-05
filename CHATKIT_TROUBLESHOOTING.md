# ChatKit FAB Troubleshooting Guide

## Issue: ChatKit FAB displays locally but not in production

### Root Causes (Most Likely)

1. **Environment Variable Missing**: `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` not set in production
2. **Build-Time Embedding**: `NEXT_PUBLIC_` variables are embedded at **build time**, not runtime
3. **Z-Index Conflict**: SupportFAB has higher z-index (9998) than ChatWidget (1050), but shouldn't hide it

### Quick Diagnosis

**Check if ChatWidget is rendering:**

1. Open browser DevTools → Console
2. Look for: `ChatWidget: NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not set. Chat widget will not be displayed.`
3. If you see this warning, the environment variable is missing

**Check if it's hidden by CSS:**

1. Inspect the page → Search for `chatWidget` class
2. If the element exists but is hidden, check:
   - `display: none`
   - `visibility: hidden`
   - `opacity: 0`
   - Z-index conflicts

### Checklist

#### 1. Verify Environment Variable in Production

- [ ] Check your production platform (Vercel, Netlify, etc.) environment variables
- [ ] Ensure `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` is set
- [ ] Value should be: `wf_691f16921c608190858a647f4c8459b60da29e275dd77b81`

#### 2. Verify Build-Time Embedding

- [ ] `NEXT_PUBLIC_` variables are embedded at build time, not runtime
- [ ] If you added the variable after deployment, you need to **rebuild** the application
- [ ] The variable must be present during the build process

#### 3. Check Production Build Logs

Look for warnings like:

```
ChatWidget: NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not set. Chat widget will not be displayed.
```

#### 4. Verify Variable Name

- [ ] Ensure it's exactly `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` (case-sensitive)
- [ ] No typos or extra spaces

#### 5. Platform-Specific Steps

**For Vercel:**

1. Go to Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` with value `wf_691f16921c608190858a647f4c8459b60da29e275dd77b81`
3. Select all environments (Production, Preview, Development)
4. **Redeploy** the application (the variable must be present during build)

**For Netlify:**

1. Go to Site Settings → Environment Variables
2. Add `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` with the value
3. **Trigger a new build** (the variable must be present during build)

**For Other Platforms:**

- Ensure the environment variable is set before the build process starts
- Redeploy after adding the variable

### Code Reference

The ChatWidget component checks for the workflow ID here:

```typescript
// components/ui/ChatWidget/ChatWidget.tsx (line 228-234)
if (!chatkitWorkflowId) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'ChatWidget: NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not set. Chat widget will not be displayed.'
    )
  }
  return null
}
```

### Testing

After setting the environment variable and redeploying:

1. Check browser console for any ChatKit-related errors
2. Verify the ChatKit script is loading: `https://cdn.platform.openai.com/deployments/chatkit/chatkit.js`
3. Check that the floating button appears in the bottom-right corner

### Z-Index Analysis

Current z-index values:

- **ChatWidget**: `z-index: var(--z-modal)` = **1050**
- **SupportFAB**: `z-index: 9998` (hardcoded)
- **TicketSubmissionForm Modal**: `z-index: var(--z-modal)` = **1050**

**Note**: SupportFAB has a much higher z-index, but this shouldn't prevent ChatWidget from displaying. If ChatWidget is completely missing (not just hidden), it's likely the environment variable issue.

### Additional Notes

- The ChatWidget is always rendered in `app/layout.tsx` (line 243)
- It conditionally returns `null` if the workflow ID is missing (line 228-234)
- The component is client-side only (`'use client'`), so it won't cause SSR issues
- Both FABs are positioned in the bottom-right corner, with SupportFAB above ChatWidget

### Production Environment Variable Verification

**For Vercel:**

```bash
# Check if variable exists
vercel env ls

# Add if missing
vercel env add NEXT_PUBLIC_CHATKIT_WORKFLOW_ID production
# Enter value: wf_691f16921c608190858a647f4c8459b60da29e275dd77b81

# Then redeploy
vercel --prod
```

**For Netlify:**

1. Go to Site Settings → Environment Variables
2. Add `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` = `wf_691f16921c608190858a647f4c8459b60da29e275dd77b81`
3. Trigger a new build

**For Other Platforms:**

- Ensure the variable is set in your production environment
- The variable must be present **during the build process**
- Redeploy after adding the variable
