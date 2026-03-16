# Troubleshooting: 404 DEPLOYMENT_NOT_FOUND on /exercises, /programs, /challenges, /workouts, /learn

**Symptom:** Visiting `aiworkoutgenerator.com/exercises` (or `/programs`, `/challenges`, `/workouts`, `/learn`) shows:

```
404: NOT_FOUND
Code: DEPLOYMENT_NOT_FOUND
```

**Cause:** astro-site rewrites those paths to a **destination URL** (the server Vercel fetches from). That destination is not serving a live deployment—e.g. the programs project has no production deploy, or the hostname in `vercel.json` (e.g. `programs.aiworkoutgenerator.com`) isn’t assigned to that project.

**You do not need a subdomain.** The public URL is already **aiworkoutgenerator.com/exercises**; users never see the destination. The destination can be the programs project’s default **\*.vercel.app** URL (no custom domain required). A subdomain is optional if you want a direct URL like programs.aiworkoutgenerator.com.

---

## Fix 1: Use the programs app’s *.vercel.app URL (no subdomain)

This is the simplest way to get aiworkoutgenerator.com/exercises working. No DNS or custom domain.

1. **Find the programs Vercel project** (Root Directory: **apps/programs**) in the dashboard.
2. **Ensure it has a successful production deployment** (trigger a deploy if needed).
3. **Copy its production URL** from **Settings → Domains** or the deployment page, e.g. **https://programs-abc123.vercel.app** (or whatever your project’s default URL is).
4. **In astro-site/vercel.json**, replace every destination that uses **programs.aiworkoutgenerator.com** with that URL. For example:
   - `"destination": "https://programs.aiworkoutgenerator.com/exercises"` → `"destination": "https://programs-abc123.vercel.app/exercises"`
   - Do the same for `/exercises/:path*`, `/learn`, `/learn/:path*`, `/programs`, `/programs/:path*`, `/challenges`, `/challenges/:path*`, `/workouts`, `/workouts/:path*`.
5. **Redeploy astro-site.**

Users will still see **aiworkoutgenerator.com/exercises**; only the internal fetch target changes.

---

## Fix 2: Set up the programs app and custom subdomain (optional)

1. **Find or create the programs Vercel project**
   - Vercel Dashboard → **Projects**. Look for the project that deploys the **programs** app (Root Directory: **apps/programs**). It may be named "programs", "programs-admin", or similar.
   - If it doesn’t exist: **Add New Project** → Import your repo → set **Root Directory** to `apps/programs` → Deploy.

2. **Ensure it has a successful production deployment**
   - Open that project → **Deployments**. The latest production deployment should be **Ready**.
   - If there’s no deployment or the last one failed, push to your main branch or trigger **Redeploy** from the dashboard.

3. **Add the custom domain**
   - In the **programs** project → **Settings** → **Domains**.
   - Add **programs.aiworkoutgenerator.com**.
   - Vercel will show the required DNS record (usually a **CNAME** to `cname.vercel-dns.com` or an **A** record).

4. **Configure DNS**
   - In your DNS provider (where aiworkoutgenerator.com is managed), add the CNAME or A record Vercel shows for **programs.aiworkoutgenerator.com**.
   - Wait for propagation (minutes to a few hours).

5. **Verify**
   - Open **https://programs.aiworkoutgenerator.com** in a browser. You should see the programs app (or a “Not found” for `/` is OK; try **https://programs.aiworkoutgenerator.com/exercises**).
   - Then try **https://aiworkoutgenerator.com/exercises** — it should load the same content (rewrite working).

Use this only if you want a direct URL like **programs.aiworkoutgenerator.com** (e.g. for bookmarks or APIs). Otherwise Fix 1 is enough.

---

## Summary

| What you want | What to do |
|---------------|------------|
| Public URL **aiworkoutgenerator.com/exercises** | Already the case; no change needed. |
| Rewrites to work, no subdomain | Use **Fix 1**: point `vercel.json` destinations to the programs project’s **\*.vercel.app** URL. |
| Optional direct URL (e.g. programs.aiworkoutgenerator.com) | Use **Fix 2**: add that domain to the programs project and DNS, then point rewrites to it if you prefer. |

See also: [phase1-base-urls.md](phase1-base-urls.md) (§ Maintaining aiworkoutgenerator.com public URLs), [DEPLOYMENT.md](DEPLOYMENT.md) (Programs app and Content Admin).
