# Cloud Armor Setup (IP-based rate limiting)

Cloud Armor provides IP-based rate limiting and DDoS protection at the load balancer. It complements the per-user Firestore rate limiting and Firebase App Check already implemented in the app.

**No code changes are required.** Configure in Google Cloud Console.

## When to use

- **Production:** Attach a Cloud Armor security policy to the load balancer or backend used by Firebase App Hosting (or your hosting backend).
- **Suggested rule:** Rate limit (e.g. 100 requests per minute per IP) to cap abuse from a single IP regardless of user accounts.

## Steps (Google Cloud Console)

1. **Open Cloud Armor**
   - [Google Cloud Console](https://console.cloud.google.com) → Network Security → Cloud Armor.

2. **Create a security policy**
   - Create policy → name (e.g. `api-rate-limit-policy`).
   - Add a rule:
     - **Rate limit:** e.g. 100 requests per minute per client IP.
     - Optionally add geo-blocking or an OWASP Top 10 preset if needed.

3. **Attach the policy to your backend**
   - Attach the policy to the backend service or load balancer that fronts your App Hosting / Next.js app.
   - For Firebase App Hosting, the backend is managed by Firebase; check [Firebase App Hosting docs](https://firebase.google.com/docs/app-hosting) for how to attach Cloud Armor (e.g. via Load Balancing or VPC).

4. **Monitor**
   - Cloud Armor and Load Balancing metrics show request counts and blocked requests. You can add a Cloud Monitoring alert on high 429 or blocked-request volume.

## Relationship to app-level protections

| Layer                    | Scope                                                       | Where                               |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------- |
| **Cloud Armor**          | Per-IP rate limit (e.g. 100/min)                            | GCP load balancer                   |
| **Firestore rate limit** | Per-user, per-endpoint (e.g. 10/min for workout generation) | `src/lib/rate-limit.ts`, API routes |
| **Firebase App Check**   | Bot / attestation                                           | Client + API routes                 |

Cloud Armor caps total traffic from an IP; per-user rate limiting and App Check protect against abuse from many accounts or scripted clients.

## References

- [Cloud Armor overview](https://cloud.google.com/armor/docs)
- [Rate limiting with Cloud Armor](https://cloud.google.com/armor/docs/rate-limiting)
- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
