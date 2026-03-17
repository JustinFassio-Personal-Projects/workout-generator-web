# Sentry MCP Server Setup (Cursor)

The Sentry MCP server connects Cursor to your Sentry org so you can query issues, search errors, and use Seer from the IDE. It uses **OAuth** with your Sentry account (no API token in the config).

## Current config (`.cursor/mcp.json`)

- **URL:** `https://mcp.sentry.dev/mcp`  
  This is the canonical OAuth endpoint. Cursor should prompt you to sign in with Sentry when you first use the server.

## If you see "The MCP server needs authentication"

1. **Trigger OAuth in Cursor**
   - Open **Cursor → Settings → Cursor Settings → MCP** (or `⌘ + Shift + J` → Skills and Integrations → MCP).
   - Find the **Sentry** server and check its status.
   - If there is a **Login** or **Authenticate** action, use it to open the Sentry OAuth flow in your browser.
   - If you use **cursor-agent**, run in a terminal:  
     `cursor-agent mcp login sentry`  
     then complete the browser OAuth flow.

2. **Use the legacy command-based config (often triggers browser OAuth)**
   If the URL-based server never shows a login prompt, switch to the proxy that runs locally and connects to Sentry; it often opens the browser for OAuth when the server returns "unauthorized".
   - Edit `.cursor/mcp.json` and replace the `sentry` entry with:

   ```json
   "sentry": {
     "command": "npx",
     "args": ["-y", "mcp-remote@latest", "https://mcp.sentry.dev/mcp"]
   }
   ```

   - Restart Cursor or reload MCP servers, then use a Sentry tool again; when the server asks for auth, a browser window should open for Sentry OAuth.

3. **Optional: scope to one org/project**
   To restrict the MCP to a single org (or org + project), you can use path constraints in the URL (only with the URL form, not the command form):
   - Org only: `https://mcp.sentry.dev/mcp/ai-workout-generator`
   - Org + project: `https://mcp.sentry.dev/mcp/ai-workout-generator/javascript-nextjs`  
     Use the plain `https://mcp.sentry.dev/mcp` URL first until OAuth works, then try adding the path if you want scope limits.

## References

- [Sentry MCP docs](https://docs.sentry.io/product/sentry-mcp/)
- [mcp.sentry.dev](https://mcp.sentry.dev/) – install snippets and live demo
