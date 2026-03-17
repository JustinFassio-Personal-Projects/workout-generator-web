# Fixing Firebase CLI Wrong Account Issue

If Firebase CLI keeps logging you into the wrong Google account, follow these steps:

## Solution: Clear Cache and Force Re-Authentication

### Step 1: Clear Firebase CLI Cache

```bash
# Remove cached credentials
rm -rf ~/.config/configstore/firebase-tools.json

# Log out (if logged in)
firebase logout
```

### Step 2: Re-Authenticate with Correct Account

```bash
# This will open browser - MAKE SURE TO SELECT THE CORRECT ACCOUNT
firebase login --reauth
```

**IMPORTANT**: When the browser opens:

1. **Sign out of ALL Google accounts** in the browser first
2. Then sign in with ONLY the account you want (`justin@aiworkoutgen.app`)
3. Complete the authentication

### Step 3: Verify Correct Account

```bash
# Check which account you're logged in as
firebase projects:list

# Should show projects for the correct account
```

## Why This Happens

Firebase CLI caches authentication tokens and may use:

- The default browser account
- The first account in your browser session
- Cached credentials from previous logins

## Prevention

1. **Always use `--reauth` flag** when logging in:

   ```bash
   firebase login --reauth
   ```

2. **Sign out of other accounts** in your browser before running `firebase login`

3. **Use incognito/private window** if you have multiple Google accounts:
   ```bash
   # Open incognito window, then run:
   firebase login --reauth
   ```

## Alternative: Use Service Account (For CI/CD)

For automated scripts, use a service account instead:

```bash
firebase login:ci
# This generates a token for non-interactive use
```
