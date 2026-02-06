# Supabase MCP Server (Cursor)

The project uses a **local** Supabase MCP server so Cursor can talk to Supabase without the `ERR_MODULE_NOT_FOUND: @modelcontextprotocol/sdk` error (npx installs the server but not the SDK peer dependency).

---

## Which keys go where (don’t mix these up)

| Purpose                     | Where to get it                                                                                                                                                                              | Where to put it                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Supabase MCP (Cursor)**   | [Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens). Create a token with access to your org/projects.                                                          | **Cursor Settings → MCP → user-supabase → Edit → env**: add `SUPABASE_ACCESS_TOKEN` = your token. Never commit this.           |
| **Astro site (blog/leads)** | In the **Supabase project**: [Project Settings → API](https://supabase.com/dashboard/project/_/settings/api). Use **Project URL** and **anon public** key (long JWT starting with `eyJ...`). | `astro-site/.env`: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Add `astro-site/.env` to `.gitignore`; do not commit. |

- **Stripe** keys (`sb_publishable_...` / `sb_secret_...`) are for Stripe, not Supabase. Supabase anon keys are JWTs (`eyJ...`).
- **JWT secret** (long base64 in Project Settings → API) is used by Supabase to sign tokens; you don’t put it in the Astro app or MCP. The **anon key** is the public key the frontend/API uses.
- For **read/write** from the Astro server (e.g. leads, admin): use the **anon** key for public reads; for writes that bypass RLS you’d use the **service_role** key only in server-side code and never expose it to the client. RLS normally gives you “read and write” via the anon key per policy.

---

## Why it fails

If the MCP log shows **"Starting new stdio process with command: npx -y @supabase/mcp-server-supabase@latest ..."**, Cursor is using a **global** MCP config that runs npx. That runs from `~/.npm/_npx/...` where `@modelcontextprotocol/sdk` is missing. The fix is to make Cursor run the server from this repo’s `node_modules` instead.

## Setup

1. **Install dependencies** (from repo root):

   ```bash
   npm install
   ```

   This installs `@supabase/mcp-server-supabase` and `@modelcontextprotocol/sdk` (root `package.json` devDependencies).

2. **Use the project config (do not delete `.cursor/mcp.json`)**
   The **project** file `.cursor/mcp.json` is correct: it runs `node scripts/run-mcp-supabase.js` so the server uses this repo’s `node_modules` (and the SDK). **Keep it.**

   The problem is a **separate, global** MCP entry in Cursor that uses **npx** and overrides or runs instead of the project config. Fix it like this:
   - Open **Cursor Settings → MCP** (the app settings, not the project file).
   - Find the **user-supabase** or **supabase** entry that shows a command like `npx -y @supabase/mcp-server-supabase@latest ...`. That one fails (npx cache, no SDK).
   - **Delete only that global entry.** Do not delete or change the project’s `.cursor/mcp.json`.
   - With the global npx-based entry removed, Cursor will use the project’s `.cursor/mcp.json` when this workspace is open, and the Supabase MCP will start correctly.

3. **Reload Cursor** (Developer: Reload Window) so MCP restarts and picks up the project config.

4. **Authentication**  
   For the MCP server to access your Supabase account (projects, schema, etc.):
   - Get a [Supabase access token](https://supabase.com/dashboard/account/tokens).
   - In Cursor: **Settings → MCP → user-supabase → Edit**, add an `env` entry:
     - Key: `SUPABASE_ACCESS_TOKEN`
     - Value: your token  
       Or set `SUPABASE_ACCESS_TOKEN` in your shell environment before opening Cursor.

If the token is not set, the server may start but tools that need API access will fail until you add it.

**Troubleshooting:** If MCP tools return `Unauthorized. Please provide a valid access token...`, add `SUPABASE_ACCESS_TOKEN` in **Cursor Settings → MCP → [your supabase server] → Edit → env**, then reload the window. The server may appear as **project-0-Workout Generator-user-supabase** in project-scoped MCP.

---

## Verifying Supabase for the Astro site

Once the Supabase MCP server is connected in Cursor (and `SUPABASE_ACCESS_TOKEN` is set), you can verify that the database matches what the Astro site expects.

### 1. List projects

Use the MCP tool **list_projects** to confirm your Supabase project is visible. The Astro site uses the project whose URL and anon key are set in `astro-site/.env` as `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.

### 2. Check tables (public schema)

Use **list_tables** (or equivalent) for the `public` schema. The Astro blog and leads features expect:

| Table        | Used by                             |
| ------------ | ----------------------------------- |
| `posts`      | `astro-site/src/pages/api/blog.ts`  |
| `categories` | Blog API (join for posts)           |
| `authors`    | Blog API (join for posts)           |
| `leads`      | `astro-site/src/pages/api/leads.ts` |

### 3. Check blog table schema

Use **get_table_schema** for:

- **posts**: must include `id`, `slug`, `title`, `excerpt`, `featured_image`, `published_at`, `status`, `category_id`, `author_id`. Optional: `tags`, `content`, `seo_title`, `seo_description`, `created_at`, `updated_at`.
- **categories**: `id`, `slug`, `name` (and optionally `description`, `created_at`).
- **authors**: `id`, `name`, `avatar` (not `avatar_url` — the migration uses `avatar`). Optionally `slug`, `bio`, `created_at`.

The Astro blog API selects `author:authors(id, name, avatar)`. If your schema uses a different column name, the query will fail or return null for that field.

### 4. RLS

The blog API uses the **anon** key and expects:

- **posts**: public read for rows where `status = 'published'`.
- **categories** / **authors**: public read.

See `docs/supabase-blog-schema.md` for full schema and RLS details.
