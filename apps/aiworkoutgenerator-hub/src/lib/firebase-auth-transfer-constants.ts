/**
 * Shared keys for passing Firebase ID tokens when HTTP headers are stripped by proxies.
 * Kept in a tiny module so client (authenticated-fetch) and server (api-utils) stay in sync
 * without importing server-only code on the client.
 */
export const FIREBASE_ID_TOKEN_BODY_KEY = "_firebaseIdToken";
