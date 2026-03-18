/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Vertex AI / OpenAPI chat client for DeepSeek v3.2.
 * Provides timeout and retry for consistent reliability across endpoints.
 */

const MAX_ERROR_LOG_LENGTH = 500;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export type VertexAICredentials =
  | { projectId: string; region: string; accessToken: string }
  | { error: Response };

/**
 * Resolves project ID, region, and access token for Vertex AI.
 * Use in API routes: if ('error' in creds) return creds.error; then use creds.projectId, etc.
 *
 * Auth (in order):
 * 1. GOOGLE_APPLICATION_CREDENTIALS_JSON — full service account JSON string (for Vercel/production).
 * 2. Application Default Credentials (for local: gcloud auth application-default login).
 *
 * @param logPrefix - Optional prefix for auth error logs (e.g. '[generate-scaffold]').
 */
export async function getVertexAICredentials(
  logPrefix = '[vertex-ai]'
): Promise<VertexAICredentials> {
  const projectId =
    import.meta.env.GOOGLE_PROJECT_ID ||
    import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_PROJECT_ID) ||
    (typeof process !== 'undefined' && process.env?.PUBLIC_FIREBASE_PROJECT_ID);
  if (!projectId) {
    return {
      error: new Response(
        JSON.stringify({
          error:
            'GOOGLE_PROJECT_ID or PUBLIC_FIREBASE_PROJECT_ID not set. Add one to .env / Vercel env for AI generation.',
        }),
        { status: 500, headers: JSON_HEADERS }
      ),
    };
  }

  const region =
    import.meta.env.GOOGLE_LOCATION ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_LOCATION) ||
    'global';

  try {
    const { GoogleAuth } = await import('google-auth-library');
    const credentialsJson =
      typeof process !== 'undefined' ? process.env?.GOOGLE_APPLICATION_CREDENTIALS_JSON : undefined;

    const auth = credentialsJson
      ? new GoogleAuth({
          credentials: parseServiceAccountJson(credentialsJson, logPrefix),
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          projectId,
        })
      : new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
          projectId,
        });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) throw new Error('Failed to get access token');
    return { projectId, region, accessToken: tokenResponse.token };
  } catch (err) {
    console.error(`${logPrefix} Auth error:`, err);
    const isVercel =
      typeof process !== 'undefined' && process.env?.VERCEL === '1';
    const hasCredsJson =
      typeof process !== 'undefined' && !!process.env?.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const hint = hasCredsJson
      ? 'Check GOOGLE_APPLICATION_CREDENTIALS_JSON is valid JSON and the service account has Vertex AI permissions.'
      : isVercel
        ? 'AI generation on Vercel requires a service account. In the Vercel project, set GOOGLE_APPLICATION_CREDENTIALS_JSON to the full service account key JSON (same GCP project as GOOGLE_PROJECT_ID).'
        : 'Run: gcloud auth application-default login';
    return {
      error: new Response(
        JSON.stringify({
          error: `Authentication failed. ${hint}`,
        }),
        { status: 500, headers: JSON_HEADERS }
      ),
    };
  }
}

function parseServiceAccountJson(
  json: string,
  logPrefix: string
): { client_email: string; private_key: string } {
  try {
    const key = JSON.parse(json) as Record<string, unknown>;
    if (!key || typeof key.client_email !== 'string' || typeof key.private_key !== 'string') {
      throw new Error('Missing client_email or private_key in service account JSON');
    }
    return { client_email: key.client_email, private_key: key.private_key };
  } catch (e) {
    console.error(`${logPrefix} Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON:`, e);
    throw e;
  }
}

export interface VertexAICallOptions {
  systemPrompt: string;
  userPrompt: string;
  accessToken: string;
  projectId: string;
  region: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Optional prefix for retry log messages (e.g. '[generate-program-chain]'). */
  logPrefix?: string;
}

/**
 * Calls Vertex AI OpenAPI chat endpoint with timeout and retry.
 * Retries on 429 (rate limit) and 503 (service unavailable).
 */
export async function callVertexAI(options: VertexAICallOptions): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    accessToken,
    projectId,
    region,
    temperature = 0.5,
    maxTokens = 4096,
    timeoutMs = 180000,
    logPrefix = '[vertex-ai]',
  } = options;

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/endpoints/openapi/chat/completions`;

  let response: Response | undefined;
  let retries = 0;
  const maxRetries = 3;
  const baseDelay = 2000;

  while (retries <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-ai/deepseek-v3.2-maas',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) break;

    const isRetryable = response.status === 429 || response.status === 503;
    if (isRetryable && retries < maxRetries) {
      const delay = baseDelay * Math.pow(2, retries);
      const reason = response.status === 429 ? 'Rate limited' : 'Service unavailable';
      console.warn(
        `${logPrefix} ${reason} (${response.status}). Retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
      continue;
    }

    const errorText = await response.text();
    throw new Error(
      `AI API error: ${response.status} - ${errorText.substring(0, MAX_ERROR_LOG_LENGTH)}`
    );
  }

  if (!response || !response.ok) {
    throw new Error('Failed to get AI response after retries');
  }

  const rawBody = await response.text();
  let apiData: unknown;
  try {
    apiData = JSON.parse(rawBody);
  } catch {
    throw new Error(
      `AI API returned non-JSON (e.g. upstream timeout or gateway error). Body: ${rawBody.substring(0, MAX_ERROR_LOG_LENGTH)}`
    );
  }
  if (apiData && typeof apiData === 'object' && 'choices' in apiData) {
    const choices = (apiData as { choices?: Array<{ message?: { content?: string } }> }).choices;
    if (choices?.[0]?.message?.content) {
      return choices[0].message.content;
    }
  }
  if (apiData && typeof apiData === 'object' && 'content' in apiData && typeof (apiData as { content: string }).content === 'string') {
    return (apiData as { content: string }).content;
  }
  throw new Error(`Unexpected API response format. Body: ${rawBody.substring(0, MAX_ERROR_LOG_LENGTH)}`);
}
