# Development Setup

## System Requirements

### File Watching Limits (macOS)

Next.js/Turbopack requires watching many files. If you experience dev server crashes or "too many open files" errors, increase your file watching limits:

```bash
# Check current limits
ulimit -n
launchctl limit maxfiles

# Increase soft limit (temporary, for current session)
ulimit -n 10240

# Make permanent (add to ~/.zshrc or ~/.bash_profile)
echo "ulimit -n 10240" >> ~/.zshrc
source ~/.zshrc
```

**Recommended limits:**

- Soft limit: 10240 (or higher)
- Hard limit: unlimited (default)

### Memory Configuration

The dev server is configured with 4GB memory limit via:

- `NODE_OPTIONS='--max-old-space-size=4096'` in `package.json` dev script
- `.npmrc` configuration file

If you still experience memory issues, you can increase this value.

## Running the Dev Server

```bash
npm run dev
```

The dev server runs on port 5178 by default.

## Troubleshooting

### Dev Server Keeps Crashing

1. **Check file watching limits:**

   ```bash
   ulimit -n
   # Should be at least 10240
   ```

2. **Check memory usage:**

   ```bash
   ps aux | grep "next dev"
   # Look at RSS (memory) column
   ```

3. **Clear Next.js cache:**

   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Restart with increased limits:**
   ```bash
   ulimit -n 10240
   npm run dev
   ```

### "Too Many Open Files" Error

This indicates the file watching limit is too low. Follow the file watching limits setup above.

### Memory Issues

If you see "JavaScript heap out of memory" errors:

1. Increase `--max-old-space-size` in `package.json` dev script
2. Close other applications to free up system memory
3. Restart your terminal/IDE
