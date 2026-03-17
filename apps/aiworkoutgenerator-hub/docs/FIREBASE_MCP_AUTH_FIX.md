# Firebase MCP Authentication Fix

## Issue

The Firebase MCP server is failing with:

```
Authentication Error: Your credentials are no longer valid. Please run firebase login --reauth
```

## Solution

### Step 1: Authenticate Firebase CLI

Run this command in your terminal:

```bash
npx -y firebase-tools@latest login
```

This will:

1. Open a browser window
2. Prompt you to sign in with your Google account
3. Authorize Firebase CLI access
4. Save credentials to `~/.config/firebase/`

### Step 2: Verify Authentication

After logging in, verify it worked:

```bash
npx -y firebase-tools@latest projects:list
```

You should see your Firebase projects listed, including `ai-workout-generator-hub`.

### Step 3: Restart Cursor

1. **Close Cursor completely** (not just the window)
2. **Reopen Cursor**
3. The MCP server should now connect successfully

### Alternative: CI Token (For Non-Interactive Environments)

If you're in a non-interactive environment or need persistent authentication:

```bash
# Generate a CI token
npx -y firebase-tools@latest login:ci

# This will output a token that you can use
# Save it securely and configure it if needed
```

However, for local development with Cursor, the regular `firebase login` is recommended.

## Verification

After restarting Cursor, check:

1. MCP server logs should show successful connection
2. Firebase MCP tools should be available
3. No authentication errors in the console

## Troubleshooting

If authentication still fails:

1. **Check Firebase CLI version:**

   ```bash
   npx -y firebase-tools@latest --version
   ```

   Should be 15.0.0 or later.

2. **Clear old credentials:**

   ```bash
   rm -rf ~/.config/firebase/
   ```

   Then run `firebase login` again.

3. **Check project configuration:**
   - Ensure `.firebaserc` exists with correct project ID
   - Ensure you have access to the Firebase project

4. **Check MCP server logs:**
   - Look in Cursor's MCP server panel
   - Check for any additional error messages
