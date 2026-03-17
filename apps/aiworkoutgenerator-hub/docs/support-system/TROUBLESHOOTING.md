# Support System Troubleshooting

## Common Issues and Solutions

### Issue 1: "Support ticket service is not configured"

**Error:** `"Support ticket service is not configured"`  
**Endpoint:** `/api/support/create`  
**Status:** 500

#### Root Cause

`FIREBASE_CLOUD_FUNCTION_URL` environment variable is not available at runtime.

#### Solution Steps

1. **Verify secret exists:**

   ```bash
   firebase apphosting:secrets:access firebase-cloud-function-url
   ```

   Should output: `https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app`

2. **Grant access if missing:**

   ```bash
   firebase apphosting:secrets:grantaccess firebase-cloud-function-url --backend aiworkoutgenerator-hub
   ```

3. **Verify apphosting.yaml configuration:**
   Check that `apphosting.yaml` contains:

   ```yaml
   env:
     - variable: FIREBASE_CLOUD_FUNCTION_URL
       secret: firebase-cloud-function-url
   ```

4. **Trigger new deployment:**
   ```bash
   git commit --allow-empty -m "trigger redeploy"
   git push origin main
   ```

---

### Issue 2: Build fails with "Misconfigured Secret"

**Error:**

```
Permission 'secretmanager.versions.get' denied for resource
'projects/ai-workout-generator-hub/secrets/firebase-cloud-function-url/versions/latest'
```

#### Solution

Grant the App Hosting backend access to the secret:

```bash
firebase apphosting:secrets:grantaccess firebase-cloud-function-url --backend aiworkoutgenerator-hub
```

**Note:** This must be done after creating the secret. The `--force` flag when creating the secret does NOT automatically grant access to App Hosting backends.

---

### Issue 3: Support FAB not displaying

**Symptom:** The support floating action button (FAB) is not visible on the page.

#### Possible Causes

1. **User not authenticated:**
   - The FAB only displays for authenticated users
   - Check: Browser console for auth state

2. **Component not rendered:**
   - Check if `SupportFAB` is included in the layout
   - Verify no CSS is hiding it

3. **Build issue:**
   - Check deployment logs for compilation errors
   - Verify the component is included in the build

#### Solution

1. Sign in to the application
2. Check browser console for errors
3. Verify `SupportFAB` is in `src/app/layout.tsx` or the appropriate layout file

---

### Issue 4: React warnings in console

#### Warning: Missing Dialog Description

**Fix:** ✅ Already fixed in `SupportCenter.tsx`

- Added `DialogDescription` and `SheetDescription` components

#### Warning: RadioGroup controlled/uncontrolled

**Fix:** ✅ Already fixed in `ImpactSelector.tsx`

- Changed `value={selectedValue}` to `value={selectedValue || ""}`

---

### Issue 5: Cloud Function returns error

**Error:** Cloud Function returns non-200 status or error message

#### Troubleshooting Steps

1. **Test Cloud Function directly:**

   ```bash
   curl -X POST https://createsupportticketfromwebsite-vp5ysk365a-uc.a.run.app \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Check CORS settings:**
   - Cloud Function CORS is configured for:
     - `https://aiworkoutgenerator.com`
     - `https://www.aiworkoutgenerator.com`
   - Ensure your production domain matches

3. **Check Cloud Function logs:**
   - Firebase Console → Functions → `createSupportTicketFromWebsite` → Logs

---

## Debugging Tips

### Check Environment Variable at Runtime

Add temporary logging in `src/app/api/support/create/route.ts`:

```typescript
console.log(
  "FIREBASE_CLOUD_FUNCTION_URL:",
  process.env.FIREBASE_CLOUD_FUNCTION_URL
);
```

**Note:** Remove this after debugging! Don't commit sensitive logging.

### Verify Secret Access

```bash
# List all secrets
firebase apphosting:secrets:list

# Access a specific secret
firebase apphosting:secrets:access firebase-cloud-function-url

# Check backend access
firebase apphosting:backends:get aiworkoutgenerator-hub
```

### Check Deployment Status

```bash
# List backends
firebase apphosting:backends:list

# Get backend details
firebase apphosting:backends:get aiworkoutgenerator-hub
```

---

## Getting Help

If issues persist:

1. Check Firebase Console → App Hosting → Deployment logs
2. Check Firebase Console → Functions → Logs (for Cloud Function errors)
3. Review browser console for client-side errors
4. Verify all steps in [SETUP.md](./SETUP.md) were completed correctly
