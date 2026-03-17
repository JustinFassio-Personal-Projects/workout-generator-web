# Firebase MCP Server Setup

## Current Configuration

The Firebase MCP server is configured in `.idx/mcp.json`:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "experimental:mcp"]
    }
  }
}
```

## Troubleshooting

### Issue: Authentication Error

If you see errors like:

- "Authentication Error: Your credentials are no longer valid"
- "false for 'list' @ L193" (Firestore security rules)

**Solution:**

1. **Re-authenticate Firebase CLI:**

   ```bash
   npx -y firebase-tools@latest login
   ```

   This will open a browser window for authentication. Follow the prompts to authenticate.

2. **Verify Authentication:**

   ```bash
   npx -y firebase-tools@latest projects:list
   ```

   You should see your Firebase projects listed.

3. **Restart Cursor/IDE:**
   After authenticating, restart your IDE to ensure the MCP server picks up the new credentials.

### Issue: MCP Server Not Starting

If the MCP server doesn't start:

1. **Check Firebase Tools Version:**

   ```bash
   npx -y firebase-tools@latest --version
   ```

   Should be 15.0.0 or later (MCP support was added in v15.0.0).

2. **Verify Project Configuration:**
   - Ensure `.firebaserc` exists with your project ID
   - Ensure `firebase.json` exists with Firestore configuration

3. **Check MCP Server Logs:**
   - Look in Cursor's MCP server logs/console
   - Check for any error messages

### Issue: Firestore Security Rules

If you see "false for 'list'" errors, ensure:

1. **Security rules are deployed:**

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Rules allow the operation:**
   - Check `firestore.rules` for the collection you're querying
   - Ensure authenticated users have read access

### Project-Specific Configuration

The MCP server automatically detects your Firebase project from:

- `.firebaserc` file (project ID: `ai-workout-generator-hub`)
- Current working directory (should be the project root)

No additional configuration needed in `.idx/mcp.json` - the basic setup is sufficient.

## Testing MCP Server

Once authenticated, you can test the MCP server by:

1. **Using MCP tools in Cursor:**
   - The Firebase MCP server provides tools for Firestore operations
   - Check Cursor's MCP tools panel

2. **Verifying Firestore Access:**
   - Try querying collections through the MCP interface
   - Check that security rules allow the operations

## Additional Notes

- The MCP server uses the Firebase CLI's authentication
- Credentials are stored in `~/.config/firebase/` (or similar)
- If credentials expire, re-run `firebase login`
- The MCP server runs in the background and connects to Cursor via stdio
