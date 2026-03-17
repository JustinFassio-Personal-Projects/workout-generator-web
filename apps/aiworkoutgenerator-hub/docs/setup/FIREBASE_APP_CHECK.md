# Firebase App Check Setup

Firebase App Check helps protect API routes from abuse by ensuring requests come from your app (or allowed debug tokens). When enabled, API routes require a valid `X-Firebase-AppCheck` token in addition to the Firebase ID token.

## When to enable

- **Development / emulator:** Leave App Check disabled (env vars unset). All API routes no-op the check and accept requests without the header.
- **Production:** Set `FIREBASE_APP_CHECK_ENABLED=true` (server) and `NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED=true` (client) once reCAPTCHA and App Check are configured in Firebase Console.

## Environment variables

| Variable                                 | Where  | Description                                                                                                              |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED` | Client | Set to `true` or `1` to initialize App Check and attach tokens to API requests.                                          |
| `FIREBASE_APP_CHECK_ENABLED`             | Server | Set to `true` or `1` to require and verify App Check token on API routes (except webhooks).                              |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`         | Client | reCAPTCHA v3 site key from [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) or Firebase App Check setup. |

### Before enabling in production

All client API consumers (e.g. AI exercise endpoints, image generation/mapping, waiver, admin waivers, support) must attach the `X-Firebase-AppCheck` header via `getAppCheckHeaders()` from `@/lib/firebase` before you set `FIREBASE_APP_CHECK_ENABLED=true`. Otherwise those requests will receive 401. See [Client: attaching the token to API calls](#client-attaching-the-token-to-api-calls) below.

Add to `.env.local` (and deployment secrets) when enabling:

```bash
NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED=true
FIREBASE_APP_CHECK_ENABLED=true
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_v3_site_key
```

## Firebase Console steps

1. **Register reCAPTCHA v3**
   - In [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin), create a reCAPTCHA v3 key for your domain(s).
   - Or in [Firebase Console](https://console.firebase.google.com) → Project → App Check → Register provider → reCAPTCHA v3, and use the site key shown.

2. **Enable App Check for your app**
   - Firebase Console → App Check → Apps → select your Web app (or add one).
   - Add the reCAPTCHA v3 provider with your site key.
   - Optionally set token TTL (e.g. 1 hour) and enforce App Check for Firebase products if needed.

3. **Optional: Debug tokens (local/dev)**
   - App Check → Manage debug tokens → Add debug token. Use this token in the `X-Firebase-AppCheck` header when testing from curl/Postman so the backend accepts the request when `FIREBASE_APP_CHECK_ENABLED=true`.

## Client: attaching the token to API calls

The app initializes App Check in `src/lib/firebase.ts` when `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `NEXT_PUBLIC_FIREBASE_APP_CHECK_ENABLED` are set. Use `getAppCheckHeaders()` when calling API routes:

```ts
import { getAppCheckHeaders } from "@/lib/firebase";
import { getIdToken } from "@/lib/auth";

const idToken = await getIdToken();
if (!idToken) throw new Error("Not authenticated");
const response = await fetch("/api/your-route", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
    ...(await getAppCheckHeaders()),
  },
  body: JSON.stringify(data),
});
```

When App Check is disabled, `getAppCheckHeaders()` returns `{}`, so existing calls without the header continue to work.

## Cost

- First 10K App Check verifications per month are free; after that, pricing is per verification (see [Firebase pricing](https://firebase.google.com/pricing)).

## References

- [Firebase App Check (Web)](https://firebase.google.com/docs/app-check/web/recaptcha-provider)
- [Verify App Check tokens from a custom backend](https://firebase.google.com/docs/app-check/custom-resource-backend)
