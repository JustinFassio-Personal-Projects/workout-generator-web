#!/usr/bin/env node
/**
 * Wrapper to run @supabase/mcp-server-supabase from this repo's node_modules
 * so @modelcontextprotocol/sdk is found. Use this in Cursor MCP config instead of npx.
 *
 * Usage: node scripts/run-mcp-supabase.js [--read-only] [--project-ref=XXX] [--access-token=XXX]
 * Or from anywhere: node /full/path/to/Workout Generator/scripts/run-mcp-supabase.js --read-only --project-ref=...
 */
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const serverPath = path.join(
  projectRoot,
  'node_modules/@supabase/mcp-server-supabase/dist/transports/stdio.js'
)

const result = spawnSync(process.execPath, [serverPath, ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
