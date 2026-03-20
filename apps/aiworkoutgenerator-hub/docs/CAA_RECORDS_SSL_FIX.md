# CAA Records Fix for Firebase App Hosting SSL

**Problem:** App Hosting reports `DNS_CAA_NOT_ALLOWED` for `app.aiworkoutgenerator.com` (and `aiworkoutgen.app`), blocking automatic SSL certificate provisioning.

**Cause:** Your domain's CAA (Certificate Authority Authorization) records do not allow the CAs that Firebase App Hosting uses to issue certificates.

## Required CAA Records

Per [Firebase App Hosting custom domain docs](https://firebase.google.com/docs/app-hosting/custom-domain), add CAA records that allow:

1. **`letsencrypt.org`** — Let's Encrypt  
2. **`pki.goog`** — Google Trust Services (used by Firebase/Cloud)

## Steps to Fix

### 1. Identify your DNS provider

Go to your domain registrar or DNS host (e.g. Cloudflare, Namecheap, Google Domains, etc.).

### 2. Add CAA records for the domain

For **`app.aiworkoutgenerator.com`**, CAA records are typically set at the **apex domain** (`aiworkoutgenerator.com`). Add:

| Type | Name / Host | Value / Content | TTL |
|------|-------------|-----------------|-----|
| CAA | `@` (or `aiworkoutgenerator.com`) | `0 issue "letsencrypt.org"` | 3600 |
| CAA | `@` (or `aiworkoutgenerator.com`) | `0 issue "pki.goog"` | 3600 |

**For `aiworkoutgen.app`** (if used as a separate custom domain):

| Type | Name / Host | Value / Content | TTL |
|------|-------------|-----------------|-----|
| CAA | `@` (or `aiworkoutgen.app`) | `0 issue "letsencrypt.org"` | 3600 |
| CAA | `@` (or `aiworkoutgen.app`) | `0 issue "pki.goog"` | 3600 |

### 3. Provider-specific notes

- **Cloudflare:** DNS → Add record → Type: CAA, Name: `@`, Content: `0 issue "letsencrypt.org"` (add a second for pki.goog).
- **Namecheap:** Advanced DNS → Add New Record → CAA Record, Host: `@`, Value: `0 issue "letsencrypt.org"`.
- **Google Domains / Cloud DNS:** Create CAA record with the values above.

### 4. Remove conflicting CAA records (if any)

If you have CAA records that **restrict** which CAs can issue (e.g. only one CA), either:

- Add `letsencrypt.org` and `pki.goog` to the allowed list, or  
- Temporarily remove overly restrictive CAA records so Firebase can provision certs.

### 5. Verify and wait

1. Use [Google Admin Toolbox Dig](https://toolbox.googleapps.com/apps/dig/#CAA/) to verify CAA records for your domain.  
2. Allow up to 24 hours for DNS propagation.  
3. In Firebase Console → App Hosting → Backend → Settings → Domains, the custom domain status should move to `CERT_ACTIVE` after propagation.

## References

- [Firebase App Hosting custom domain](https://firebase.google.com/docs/app-hosting/custom-domain)
- [CAA record format (RFC 8659)](https://datatracker.ietf.org/doc/html/rfc8659)
