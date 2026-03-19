/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Vertex AI / OpenAPI chat client for DeepSeek v3.2.
 * Used by Program Factory, Challenge Factory, and Workout Factory (and all /api/ai/* routes).
 * Single config: GOOGLE_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS_JSON (or ADC). When a service account key is set, project_id from the key is used so all factories share the same project and permissions.
 * Provides timeout and retry for consistent reliability across endpoints.
 */

const MAX_ERROR_LOG_LENGTH = 500;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Extract a plain string from getVertexAICredentials error Response for throwing. */
async function credentialErrorToMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const j = JSON.parse(text) as { error?: string };
    if (j && typeof j.error === 'string' && j.error.trim()) return j.error.trim();
  } catch {
    // use raw text below
  }
  return text.trim() || 'Vertex AI credentials failed';
}

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
  const envProjectId =
    import.meta.env.GOOGLE_PROJECT_ID ||
    import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_PROJECT_ID) ||
    (typeof process !== 'undefined' && process.env?.PUBLIC_FIREBASE_PROJECT_ID);

  const credentialsJson =
    typeof process !== 'undefined' ? process.env?.GOOGLE_APPLICATION_CREDENTIALS_JSON : undefined;

  const region =
    import.meta.env.GOOGLE_LOCATION ||
    (typeof process !== 'undefined' && process.env?.GOOGLE_LOCATION) ||
    'global';

  try {
    // When using a service account key, parse it inside try so invalid JSON is caught and we return a graceful error.
    let projectId = envProjectId ?? undefined;
    let parsedKey: { client_email: string; private_key: string; project_id?: string } | undefined;
    if (credentialsJson) {
      parsedKey = parseServiceAccountJson(credentialsJson, logPrefix);
      if (typeof parsedKey.project_id === 'string' && parsedKey.project_id) {
        projectId = parsedKey.project_id;
      }
    }
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

    const { GoogleAuth } = await import('google-auth-library');
    const auth = parsedKey
      ? new GoogleAuth({
          credentials: { client_email: parsedKey.client_email, private_key: parsedKey.private_key },
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
): { client_email: string; private_key: string; project_id?: string } {
  try {
    const key = JSON.parse(json) as Record<string, unknown>;
    if (!key || typeof key.client_email !== 'string' || typeof key.private_key !== 'string') {
      throw new Error('Missing client_email or private_key in service account JSON');
    }
    const project_id =
      typeof key.project_id === 'string' && key.project_id ? key.project_id : undefined;
    return { client_email: key.client_email, private_key: key.private_key, project_id };
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

    if (response.status === 403) {
      const errorText = await response.text();
      let hint =
        'The service account or user does not have permission to call Vertex AI in this project. ';
      try {
        const errJson = JSON.parse(errorText) as { error?: { message?: string } };
        if (errJson?.error?.message?.includes('aiplatform.endpoints.predict')) {
          hint +=
            'Grant the service account (from GOOGLE_APPLICATION_CREDENTIALS_JSON) the role "Vertex AI User" (roles/aiplatform.user) on the GCP project matching GOOGLE_PROJECT_ID. Or set GOOGLE_PROJECT_ID to the project where that service account already has Vertex AI access.';
        }
      } catch {
        // use default hint
      }
      throw new Error(`AI API error: 403 - ${hint}`);
    }

    const isRetryable = response.status === 429 || response.status === 503;
    const totalAttempts = maxRetries + 1;
    if (isRetryable && retries < maxRetries) {
      const delay = baseDelay * Math.pow(2, retries);
      const reason = response.status === 429 ? 'Rate limited' : 'Service unavailable';
      console.warn(
        `${logPrefix} ${reason} (${response.status}). Attempt ${retries + 1}/${totalAttempts} failed; retrying in ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
      continue;
    }
    if (isRetryable && retries >= maxRetries) {
      console.warn(`${logPrefix} Attempt ${totalAttempts}/${totalAttempts} failed (${response.status}).`);
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

/**
 * Vertex AI Gemini generateContent (same credentials as Program/Challenge/Workout Factory).
 * Use for Deep Dive and User Instructions so they don't require GEMINI_API_KEY.
 * Retries on 429 (rate limit) and 503 (service unavailable) with exponential backoff.
 */
export interface VertexGeminiOptions {
  systemInstruction: string;
  userPrompt: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  responseMimeType?: string;
  logPrefix?: string;
}

export async function callVertexAIGemini(options: VertexGeminiOptions): Promise<string> {
  const creds = await getVertexAICredentials(options.logPrefix ?? '[vertex-gemini]');
  if ('error' in creds) {
    const msg = await credentialErrorToMessage(creds.error);
    throw new Error(msg);
  }
  const { projectId, region, accessToken } = creds;
  const logPrefix = options.logPrefix ?? '[vertex-gemini]';
  const model = options.model ?? 'gemini-2.0-flash-001';
  const baseUrl =
    region === 'global'
      ? `https://us-central1-aiplatform.googleapis.com`
      : `https://${region}-aiplatform.googleapis.com`;
  const location = region === 'global' ? 'us-central1' : region;
  const endpoint = `${baseUrl}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: options.userPrompt }] }],
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens ?? 8192,
      temperature: options.temperature ?? 0.5,
      ...(options.responseMimeType && { responseMimeType: options.responseMimeType }),
    },
  };

  let response: Response | undefined;
  let retries = 0;
  const maxRetries = 3;
  const baseDelay = 2000;

  while (retries <= maxRetries) {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) break;

    const errText = await response.text();
    if (response.status === 403) {
      throw new Error(
        `Vertex AI Gemini 403. Ensure the service account has Vertex AI User in project ${projectId}. ${errText.substring(0, 200)}`
      );
    }

    const isRetryable = response.status === 429 || response.status === 503;
    const totalAttempts = maxRetries + 1;
    if (isRetryable && retries < maxRetries) {
      const delay = baseDelay * Math.pow(2, retries);
      const reason = response.status === 429 ? 'Rate limited' : 'Service unavailable';
      console.warn(
        `${logPrefix} ${reason} (${response.status}). Attempt ${retries + 1}/${totalAttempts} failed; retrying in ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
      continue;
    }
    if (isRetryable && retries >= maxRetries) {
      console.warn(`${logPrefix} Attempt ${totalAttempts}/${totalAttempts} failed (${response.status}).`);
    }
    throw new Error(`Vertex AI Gemini error: ${response.status} - ${errText.substring(0, MAX_ERROR_LOG_LENGTH)}`);
  }

  if (!response || !response.ok) {
    throw new Error('Vertex AI Gemini failed after retries');
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error(`Vertex AI Gemini unexpected response: ${JSON.stringify(data).substring(0, 300)}`);
  }
  return text.trim();
}
