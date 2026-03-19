import { GoogleGenAI } from '@google/genai';
import type { ExerciseConfig } from '@/features/TutorialLab/types/tutorial';
import type { MuscleEngagementMap, MuscleEngagementItem, MuscleRole } from '@/types/generated-exercise';
import { getVertexAICredentials, callVertexAI } from '@/lib/vertex-ai-client';
import { MUSCLE_IDS, isValidMuscleId, MUSCLE_DISPLAY_NAMES } from '@/lib/muscle-map/constants';

// NOTE: This must only be used server-side to protect the API key
const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  // In development, we might not have the key set yet, but we shouldn't crash until we try to use it
  if (process.env.NODE_ENV !== 'production') {
    console.warn('GEMINI_API_KEY is not set in environment variables');
  }
}

const client = new GoogleGenAI({ apiKey: apiKey || '' });

const GEMINI_API_KEY_MESSAGE =
  'GEMINI_API_KEY is not set. Set it in your deployment environment or server secrets (e.g. host dashboard, CI/CD, or .env) for deep dive and AI features.';

function requireGeminiApiKey(): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(GEMINI_API_KEY_MESSAGE);
  }
}

function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes('503') || lower.includes('unavailable')) return true;
  if (lower.includes('deadline expired') || lower.includes('deadline_exceeded')) return true;
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('resource exhausted')) return true;
  if (error && typeof error === 'object') {
    const obj = error as { status?: string; code?: number };
    if (obj.status === 'UNAVAILABLE' || obj.code === 503) return true;
    if (obj.status === 'RESOURCE_EXHAUSTED' || obj.code === 429) return true;
  }
  return false;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function withRetry<T>(fn: () => Promise<T>, logPrefix = '[gemini]'): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < MAX_RETRIES && isRetryableError(error);
      if (!canRetry) throw error;
      // Standard exponential backoff (2s, 4s, 8s). Shorter first delay would risk hammering rate-limited/overloaded Gemini API.
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      const snippet = error instanceof Error ? error.message : String(error);
      console.warn(
        `${logPrefix} Retryable error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms:`,
        snippet.substring(0, 120)
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const RESEARCH_SYSTEM_PROMPT = `
Role: "Biomechanical Analyst and Professional Strength Coach."

Tasks:

Use Google Search to verify postural cues, joint angles, and safety for the exercise.

Output 5 biomechanical points: Biomechanical Chain, Pivot Points, Stabilization Needs, Common Mistakes, Performance Cues.

Use Unicode symbols for math and units (e.g. τ, ×, θ, °) and plain text only; do not use LaTeX or $...$ math notation.

Output an IMAGE_PROMPT with technical accuracy, style, complexity, and demographics when given. When form cues, misrenderings to avoid, or domain context are provided, incorporate them strictly into the imagePrompt. When Output Mode is Sequence, output imagePrompts (array of 3 strings) instead of imagePrompt.

Output: STRICT valid JSON with biomechanicalPoints (string array) and either imagePrompt (string) or imagePrompts (array of 3 strings for start/mid/end). Do not include markdown code blocks.
`;

/** Raw grounding chunk from Gemini (structure varies) */
export interface GroundingChunk {
  web?: { uri?: string; title?: string };
  uri?: string;
  title?: string;
}

export interface ResearchResult {
  biomechanicalPoints: string[];
  imagePrompt: string;
  /** When outputMode=sequence: 3 prompts for start, mid, end */
  imagePrompts?: string[];
  searchResults?: GroundingChunk[];
}

export async function researchTopicForPrompt(
  exerciseTopic: string,
  complexityLevel: string = 'intermediate',
  visualStyle: string = 'photorealistic',
  demographics?: string,
  movementPhase?: string,
  bodySide?: string,
  formCuesToEmphasize?: string,
  misrenderingsToAvoid?: string,
  domainContext?: string,
  outputMode?: 'single' | 'sequence',
  bodySideStart?: string,
  bodySideEnd?: string
): Promise<ResearchResult> {
  requireGeminiApiKey();
  const isSequence = outputMode === 'sequence';
  const prompt = `
Exercise Topic: ${exerciseTopic}
Complexity Level: ${complexityLevel}
Visual Style: ${
    visualStyle === 'multiplicity' && !isSequence
      ? 'Multiplicity (Sequence Composite) - Show subject in multiple positions (start, mid, end) in a single frame to demonstrate full range of motion. Use a static background with the subject appearing multiple times to show the path of movement.'
      : isSequence
        ? 'Photorealistic/consistent style - each of 3 images will show ONE phase. Same subject, background, lighting.'
        : visualStyle
  }
${isSequence ? '\nOutput Mode: Sequence - Produce 3 separate image prompts for the START, MID, and END positions of the movement. Same subject, style, and background for all 3. Each prompt describes ONE phase only. Output JSON with biomechanicalPoints (array) and imagePrompts (array of exactly 3 strings: [startPrompt, midPrompt, endPrompt]).' : ''}
${demographics ? `Demographics: ${demographics}` : ''}
${movementPhase && !isSequence ? `Movement Phase: ${movementPhase}` : ''}
${
  isSequence && (bodySideStart || bodySideEnd)
    ? `Start view: ${bodySideStart || 'not specified'}; End view: ${bodySideEnd || 'not specified'}`
    : bodySide
      ? `Body Side: ${bodySide}`
      : ''
}
${formCuesToEmphasize ? `\n\nForm cues to emphasize in the image (MUST be reflected in imagePrompt(s)):\n${formCuesToEmphasize}` : ''}
${misrenderingsToAvoid ? `\n\nCommon misrenderings to AVOID (do NOT describe these in imagePrompt(s)):\n${misrenderingsToAvoid}` : ''}
${domainContext ? `\n\nDomain/style context:\n${domainContext}` : ''}
`;

  try {
    const response = await withRetry(
      () =>
        client.models.generateContent({
          model: 'gemini-3-pro-preview',
          config: {
            systemInstruction: RESEARCH_SYSTEM_PROMPT,
            tools: [{ googleSearch: {} }],
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      '[generate-exercise-image:research]'
    );

    const candidate = response.candidates?.[0];
    const textPart = candidate?.content?.parts?.find((p: { text?: string }) => p.text);
    const text = textPart?.text || '';

    // Robust JSON parsing
    let parsed: { biomechanicalPoints?: string[]; imagePrompt?: string; imagePrompts?: string[] };

    // First try cleaning markdown code blocks (any language hint); extract first block content
    const blockMatch = text.match(/```[\w+-]*\s*\n?([\s\S]*?)```/);
    const cleanedText = blockMatch
      ? blockMatch[1].trim()
      : text.replace(/```json\n?|\n?```/g, '').trim();

    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      // Fallback: try to find JSON object structure
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Failed to parse JSON. Raw text:', text);
        throw new Error('Failed to parse JSON from research response');
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.error('Failed to parse extracted JSON block. Block:', jsonMatch[0]);
        throw new Error('Failed to parse extracted JSON block');
      }
    }

    // Extract search results
    const searchResults = candidate?.groundingMetadata?.groundingChunks;

    const imagePrompts = parsed.imagePrompts;
    const validImagePrompts =
      Array.isArray(imagePrompts) &&
      imagePrompts.length === 3 &&
      imagePrompts.every((s) => typeof s === 'string')
        ? imagePrompts
        : undefined;

    return {
      biomechanicalPoints: parsed.biomechanicalPoints || [],
      imagePrompt: validImagePrompts ? validImagePrompts[0]! : parsed.imagePrompt || '',
      imagePrompts: validImagePrompts,
      searchResults,
    };
  } catch (error) {
    console.error('Error in researchTopicForPrompt:', error);
    throw error;
  }
}

/** Content part type for multimodal requests */
interface ContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GenerateInfographicImageOptions {
  /** When true, the reference shows a different phase; output MUST be a different pose (sequence mode). */
  requireDifferentPose?: boolean;
}

export async function generateInfographicImage(
  imagePrompt: string,
  referenceImageBase64?: string,
  options?: GenerateInfographicImageOptions
): Promise<string> {
  try {
    // Build content parts - include reference image if provided
    const parts: ContentPart[] = [];

    if (referenceImageBase64) {
      // Strip data URL prefix if present to get raw base64 (subtype may include + or -, e.g. image/svg+xml, image/x-icon)
      const base64Data = referenceImageBase64.replace(/^data:image\/[^;]+;base64,/, '');
      // Detect mime type from data URL or default to png
      const mimeMatch = referenceImageBase64.match(/^data:(image\/[^;]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      // Add reference image first
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });

      const requireDifferentPose = options?.requireDifferentPose;
      const referenceInstruction = requireDifferentPose
        ? `This reference image shows ONE phase of an exercise. Generate a NEW image with a DIFFERENT body position and pose as described below. Use the reference ONLY for subject appearance (same person: face, body type, skin tone, hair, clothing). The POSE and BODY POSITION must be DISTINCTLY different from the reference. Do NOT replicate the reference pose. The prompt below specifies the exact position/phase you must show:`
        : `Using the person/subject from this reference image, generate a new exercise image. Maintain the same subject appearance (face, body type, skin tone, hair, clothing style).`;

      // Add prompt with reference instruction
      parts.push({
        text: `${referenceInstruction} ${imagePrompt}`,
      });
    } else {
      // No reference image - just use the prompt
      parts.push({ text: imagePrompt });
    }

    const response = await withRetry(
      () =>
        client.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          config: {
            responseModalities: ['IMAGE'],
          },
          contents: [{ role: 'user', parts }],
        }),
      '[generate-exercise-image:image]'
    );

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(
      (p: { inlineData?: { mimeType?: string; data?: string } }) => p.inlineData
    );

    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    throw new Error('No image data found in response');
  } catch (error) {
    console.error('Error in generateInfographicImage:', error);
    throw error;
  }
}

/**
 * Generates an anatomical illustration of the body with the given muscles emphasized.
 * Uses the same image model as Exercise Image Generator (generateInfographicImage).
 * Requires GEMINI_API_KEY.
 */
export async function generateAnatomicalMuscleImage(
  exerciseName: string,
  muscleEngagementMap: MuscleEngagementMap
): Promise<string> {
  requireGeminiApiKey();
  const { muscles, view } = muscleEngagementMap;
  if (!muscles?.length) {
    throw new Error('muscleEngagementMap.muscles is required and must not be empty');
  }
  const primary = muscles.filter((m) => m.role === 'primary').map((m) => MUSCLE_DISPLAY_NAMES[m.id] ?? m.id);
  const secondary = muscles.filter((m) => m.role === 'secondary').map((m) => MUSCLE_DISPLAY_NAMES[m.id] ?? m.id);
  const stabilizer = muscles.filter((m) => m.role === 'stabilizer').map((m) => MUSCLE_DISPLAY_NAMES[m.id] ?? m.id);
  const viewHint =
    view === 'posterior'
      ? 'Show a rear (posterior) view of the body.'
      : view === 'both'
        ? 'Show anterior and posterior views if possible, or the view that best shows the listed muscles.'
        : 'Show a front (anterior) view of the body.';
  const prompt = `Anatomical illustration of a human body for the exercise "${exerciseName}". Transparent musculature style, educational medical diagram. ${viewHint} Clearly emphasize and highlight these muscles: Primary movers: ${primary.join(', ') || 'none'}. Secondary: ${secondary.join(', ') || 'none'}. Stabilizers: ${stabilizer.join(', ') || 'none'}. Clean, professional medical/anatomy illustration, suitable for a fitness learning page. Single image.`;
  return generateInfographicImage(prompt);
}

/** Biomechanics context for user-friendly instruction generation */
export interface ParsedBiomechanicsContext {
  biomechanicalChain?: string;
  pivotPoints?: string;
  stabilizationNeeds?: string;
  commonMistakes?: string[];
  performanceCues?: string[];
}

const USER_INSTRUCTIONS_SYSTEM_PROMPT = `You are a friendly personal trainer. Your goal is to write clear, simple instructions for people who have never done this exercise and have no background in kinesiology or anatomy.

Rules:
- Use plain language. Avoid jargon (e.g. "kinetic chain", "pivot points", "eccentric phase"). If you must use a term, explain it in one short phrase.
- Write step-by-step instructions: what to do first, then next, and so on. Use numbered steps.
- Keep each step short and actionable. Focus on what the user should do and feel, not on biomechanics theory.
- Include 1–3 brief "tips" or "what to avoid" based on common mistakes, phrased in simple terms.
- Output valid Markdown only: use ## for section headings, ** for bold, numbered lists for steps. No HTML, no code blocks.
- Tone: encouraging and clear, not clinical. Write for someone reading on their phone before a workout.`;

/**
 * Generates user-friendly, plain-language exercise instructions (markdown).
 * Used as the main content on the public exercise page when present.
 */
/**
 * Generates user-friendly instructions using Vertex AI (same endpoint and model as Program/Challenge/Workout Factory).
 * No GEMINI_API_KEY required.
 */
export async function generateUserFriendlyInstructions(
  exerciseName: string,
  biomechanics?: ParsedBiomechanicsContext | null
): Promise<string> {
  const chain = biomechanics?.biomechanicalChain?.trim() || 'Not specified';
  const pivots = biomechanics?.pivotPoints?.trim() || 'Not specified';
  const stabilization = biomechanics?.stabilizationNeeds?.trim() || 'Not specified';
  const mistakes =
    (biomechanics?.commonMistakes?.length ?? 0) > 0
      ? biomechanics!.commonMistakes!.join('; ')
      : 'None specified';
  const cues =
    (biomechanics?.performanceCues?.length ?? 0) > 0
      ? biomechanics!.performanceCues!.join('; ')
      : 'None specified';

  const userPrompt = `Write user-friendly instructions for the exercise: "${exerciseName}".

Use this technical context only to keep the instructions accurate; translate everything into simple language:
- Movement / chain: ${chain}
- Pivot points: ${pivots}
- Stabilization: ${stabilization}
- Common mistakes to warn about: ${mistakes}
- Performance cues (translate into "do this" steps): ${cues}

Output only the Markdown. Start with a short 1–2 sentence intro, then a "How to do it" section with numbered steps, then optional "Tips" or "What to avoid" if relevant.`;

  try {
    const creds = await getVertexAICredentials('[generateUserFriendlyInstructions]');
    if ('error' in creds) {
      const text = await creds.error.text();
      throw new Error(text || 'Vertex AI credentials failed');
    }
    const { projectId, region, accessToken } = creds;
    let markdown = await callVertexAI({
      systemPrompt: USER_INSTRUCTIONS_SYSTEM_PROMPT,
      userPrompt,
      accessToken,
      projectId,
      region,
      maxTokens: 4096,
      logPrefix: '[generateUserFriendlyInstructions]',
    });
    markdown = markdown.replace(/^```markdown\n?|\n?```$/g, '').trim();
    return markdown;
  } catch (error) {
    console.error('Error in generateUserFriendlyInstructions:', error);
    throw error;
  }
}

/** Context for generating a tutorial config from exercise data */
export interface TutorialConfigContext {
  biomechanics?: ParsedBiomechanicsContext | null;
  userFriendlyInstructions?: string | null;
}

const TUTORIAL_CONFIG_SYSTEM_PROMPT = `You generate a tutorial configuration for a camera-based exercise tutorial. The config drives phases and pose checks (MediaPipe Pose Landmarker).

Output STRICT valid JSON only, no markdown. Shape:
{
  "id": "slug-like-id",
  "name": "Exercise Name",
  "description": "Short intro for the user (1-2 sentences).",
  "phases": [
    {
      "id": "phase-id",
      "name": "Phase Name",
      "instructionText": "What the user should do in this phase.",
      "targetJoints": [23, 24, 25, 26, 27, 28],
      "successCriteria": [
        { "jointA": 23, "jointB": 25, "jointC": 27, "targetAngle": 90, "operator": "<" }
      ],
      "cameraOrientation": "front"
    }
  ]
}

MediaPipe Pose Landmark indices (0-32): 0=nose, 11/12=left/right shoulder, 13/14=left/right elbow, 15/16=left/right wrist, 23/24=left/right hip, 25/26=left/right knee, 27/28=left/right ankle, 29/30=left/right heel, 31/32=left/right foot index.
- Angles are at the vertex: jointB is the vertex; angle is between (jointA, jointB, jointC). operator "<" means angle at jointB must be less than targetAngle (e.g. knee bend).
- Use only these indices in targetJoints and successCriteria. Phases without pose checks can have empty successCriteria and minimal targetJoints.
- cameraOrientation: "front" when user faces camera (e.g. push-up plank), "side" when user stands sideways for profile view (e.g. squat depth, knee angle). Choose per phase.`;

/**
 * Generates a Tutorial Lab ExerciseConfig from exercise name and context (biomechanics, user instructions).
 * Used to seed a camera-based tutorial for an approved exercise.
 * Uses same Vertex AI endpoint and model as Program/Challenge/Workout Factory.
 */
export async function generateTutorialConfig(
  exerciseName: string,
  context: TutorialConfigContext
): Promise<ExerciseConfig> {
  const chain = context.biomechanics?.biomechanicalChain?.trim() || 'Not specified';
  const pivots = context.biomechanics?.pivotPoints?.trim() || 'Not specified';
  const stabilization = context.biomechanics?.stabilizationNeeds?.trim() || 'Not specified';
  const mistakes =
    (context.biomechanics?.commonMistakes?.length ?? 0) > 0
      ? context.biomechanics!.commonMistakes!.join('; ')
      : 'None specified';
  const cues =
    (context.biomechanics?.performanceCues?.length ?? 0) > 0
      ? context.biomechanics!.performanceCues!.join('; ')
      : 'None specified';
  const userInstructions = (context.userFriendlyInstructions ?? '').slice(0, 800);

  const userPrompt = `Generate a tutorial config for the exercise: "${exerciseName}".

Technical context (use to choose phases and angles):
- Movement / chain: ${chain}
- Pivot points: ${pivots}
- Stabilization: ${stabilization}
- Common mistakes: ${mistakes}
- Performance cues: ${cues}
${userInstructions ? `\nUser-friendly instructions (use for description and phase text): ${userInstructions}` : ''}

Create 3-6 phases (e.g. Setup, Descent/Movement, Hold/Check, Return, Complete). For phases that check form, add successCriteria with jointA, jointB, jointC (vertex), targetAngle in degrees, and operator "<" or ">" or "==". Use MediaPipe indices only. Add cameraOrientation "front" or "side" per phase (e.g. side for squat depth, front for push-up).
Output only the JSON object, no other text.`;

  try {
    const creds = await getVertexAICredentials('[generateTutorialConfig]');
    if ('error' in creds) {
      const text = await creds.error.text();
      throw new Error(text || 'Vertex AI credentials failed');
    }
    const { projectId, region, accessToken } = creds;
    const raw = (
      await callVertexAI({
        systemPrompt: TUTORIAL_CONFIG_SYSTEM_PROMPT,
        userPrompt,
        accessToken,
        projectId,
        region,
        maxTokens: 2048,
        logPrefix: '[generateTutorialConfig]',
      })
    ).trim();
    // Strip markdown code fence if present
    const cleanedRaw = raw.replace(/^```[\w-]*\s*\n?|\n?```\s*$/g, '').trim();
    const parsed = JSON.parse(cleanedRaw) as ExerciseConfig;
    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      throw new Error('Invalid config: missing phases array');
    }
    if (!parsed.id) {
      parsed.id = exerciseName.toLowerCase().replace(/\s+/g, '-');
    }
    if (!parsed.name) {
      parsed.name = exerciseName;
    }
    parsed.description = parsed.description ?? `Tutorial for ${exerciseName}`;
    for (let i = 0; i < parsed.phases.length; i++) {
      const p = parsed.phases[i];
      if (typeof p.id !== 'string' || !p.id.trim()) {
        p.id = `phase-${i}`;
      } else {
        p.id = p.id.trim();
      }
      if (typeof p.name !== 'string' || !p.name.trim()) {
        p.name = `Phase ${i + 1}`;
      } else {
        p.name = p.name.trim();
      }
      if (typeof p.instructionText !== 'string' || !p.instructionText.trim()) {
        p.instructionText = 'Follow the on-screen guidance.';
      } else {
        p.instructionText = p.instructionText.trim();
      }
      p.targetJoints = Array.isArray(p.targetJoints) ? p.targetJoints : [];
      p.successCriteria = Array.isArray(p.successCriteria) ? p.successCriteria : [];
      if (p.cameraOrientation !== 'front' && p.cameraOrientation !== 'side') {
        p.cameraOrientation = 'front';
      }
    }
    return parsed;
  } catch (error) {
    console.error('Error in generateTutorialConfig:', error);
    throw error;
  }
}

const MUSCLE_ENGAGEMENT_SYSTEM_PROMPT = `You are an expert strength coach. Output valid JSON only: a muscle engagement map for an exercise.

Allowed muscle IDs (use exactly these strings, no others): ${MUSCLE_IDS.join(', ')}

Output format:
{
  "view": "anterior" | "posterior" | "both",
  "muscles": [ { "id": "<muscle_id>", "role": "primary" | "secondary" | "stabilizer" }, ... ]
}

Rules:
- "view": Use "anterior" when the exercise primarily involves front-of-body muscles (chest, anterior delts, abs, quads). Use "posterior" for back, glutes, hamstrings, rear delts. Use "both" when the exercise meaningfully engages both.
- "muscles": List 3–12 muscles that are engaged. Use only IDs from the allowed list. Classify each as primary (main movers), secondary (assistors), or stabilizer.
- Output only the JSON object. No markdown, no code fence, no explanation.`;

/**
 * Generates structured muscle engagement map for the Deep Dive diagram.
 * Used by generate-page API; output is validated and stored in muscle_engagement_map.
 */
export async function generateMuscleEngagementMap(
  exerciseName: string,
  biomechanics?: {
    biomechanicalChain: string;
    pivotPoints: string;
    stabilizationNeeds: string;
  }
): Promise<MuscleEngagementMap> {
  const chain = biomechanics?.biomechanicalChain?.trim() || 'Not specified';
  const pivots = biomechanics?.pivotPoints?.trim() || 'N/A';
  const stabilization = biomechanics?.stabilizationNeeds?.trim() || 'N/A';
  const userPrompt = `Exercise: "${exerciseName}".
Context: Chain: ${chain}. Pivots: ${pivots}. Stabilization: ${stabilization}.
Output the muscle engagement JSON (view + muscles array with id and role).`;

  try {
    const creds = await getVertexAICredentials('[generateMuscleEngagementMap]');
    if ('error' in creds) {
      const text = await creds.error.text();
      throw new Error(text || 'Vertex AI credentials failed');
    }
    const { projectId, region, accessToken } = creds;
    let raw = await callVertexAI({
      systemPrompt: MUSCLE_ENGAGEMENT_SYSTEM_PROMPT,
      userPrompt,
      accessToken,
      projectId,
      region,
      maxTokens: 1024,
      logPrefix: '[generateMuscleEngagementMap]',
    });
    raw = raw.replace(/^```[\w-]*\s*\n?|\n?```\s*$/g, '').trim();
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    const jsonStr = firstBrace >= 0 && lastBrace > firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw;
    let parsed: { view?: string; muscles?: { id?: string; role?: string }[] };
    try {
      parsed = JSON.parse(jsonStr) as { view?: string; muscles?: { id?: string; role?: string }[] };
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw new Error(`Muscle map JSON parse failed: ${msg}. Raw length: ${raw.length}`);
    }
    const view = parsed.view === 'posterior' ? 'posterior' : parsed.view === 'both' ? 'both' : 'anterior';
    const roles: MuscleRole[] = ['primary', 'secondary', 'stabilizer'];
    const muscles: MuscleEngagementItem[] = (parsed.muscles ?? [])
      .filter((m) => m.id && typeof m.id === 'string' && isValidMuscleId(m.id))
      .filter((m) => m.role && roles.includes(m.role as MuscleRole))
      .map((m) => ({ id: m.id!, role: m.role as MuscleRole }))
      .slice(0, 20);
    return { view, muscles };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generateMuscleEngagementMap:', message);
    throw error;
  }
}

const DEEP_DIVE_SYSTEM_PROMPT = `
You are an Elite Strength Coach and Web Developer. Your goal is to output a single, beautiful, responsive HTML5 file (with embedded Tailwind CSS via CDN) that serves as the 'Ultimate Guide' for a specific exercise.

Structure:
1. One <h1> — the exercise name as the main page title (no other <h1> on the page).
2. Hero Section (use the provided image URL)
3. Biomechanics (Deep dive: Moment arms, Force vectors, Kinetic chain)
4. Muscle Map — include only a short text description of primary movers, secondary movers, and stabilizers. Do NOT include a Muscle Engagement Visualization diagram or any SVG drawing. The muscle diagram is rendered by the application. You may add one short line such as: "Muscles engaged are shown in the diagram above."
5. Execution Protocol — use an <h2> or <h3> titled exactly "Execution Protocol" and a single <ol> with one <li> per step (numbered execution steps). This section is used by the Daily Warm-Up timer.
6. Common Mistakes table

Headings: Use a single <h1> for the exercise name; use <h2> for major sections and <h3> for subsections; keep a logical hierarchy (do not skip levels, e.g. no h4 without h3).

Tone: Clinical, educational, and encouraging.
Content: Deeply research the specific biomechanics for the given exercise name.
Images: Embed the provided image URL in the Hero Section.

Use Unicode symbols for math and units (e.g. τ, ×, θ, °) and plain text only; do not use LaTeX or $...$ math notation.

Do not include a Sources or References section; sources are added by the application.

Output: Return ONLY the raw HTML string. Do not include markdown code blocks.
`;

/**
 * Generates Deep Dive HTML for an exercise. Used by admin generate-page API.
 * Uses same Vertex AI endpoint and model as Program/Challenge/Workout Factory.
 */
/**
 * Generates Deep Dive HTML using Vertex AI (same endpoint and model as Program/Challenge/Workout Factory).
 * No GEMINI_API_KEY required.
 */
export async function generateExerciseHtml(
  exerciseName: string,
  imageUrl: string,
  biomechanics?: {
    biomechanicalChain: string;
    pivotPoints: string;
    stabilizationNeeds: string;
  },
  /** URL for the "Go Back" button (default: /exercises). */
  backLinkHref: string = '/exercises'
): Promise<string> {
  const userPrompt = `
Generate a Deep Dive HTML page for the exercise: "${exerciseName}".
The first heading must be a single <h1> containing the exercise name.

Image URL: ${imageUrl}

Biomechanics Context:
- Chain: ${biomechanics?.biomechanicalChain || 'N/A'}
- Pivots: ${biomechanics?.pivotPoints || 'N/A'}
- Stabilization: ${biomechanics?.stabilizationNeeds || 'N/A'}

Ensure the HTML is fully self-contained with Tailwind CSS (via CDN) and uses a high-contrast, clean typography design (Inter/Roboto).
Include a "Go Back" button that links to "${backLinkHref}".
Do not include any SVG or diagram in the Muscle Map section; the muscle diagram is rendered by the application.
`;

  try {
    const creds = await getVertexAICredentials('[generateExerciseHtml]');
    if ('error' in creds) {
      const text = await creds.error.text();
      throw new Error(text || 'Vertex AI credentials failed');
    }
    const { projectId, region, accessToken } = creds;
    let html = await callVertexAI({
      systemPrompt: DEEP_DIVE_SYSTEM_PROMPT,
      userPrompt,
      accessToken,
      projectId,
      region,
      maxTokens: 8192,
      logPrefix: '[generateExerciseHtml]',
    });

    // Extract HTML document or strip markdown fences (handles ```html, ```XML, ```, etc.)
    const htmlMatch = html.match(/<html[\s\S]*<\/html\s*>/i);
    if (htmlMatch) {
      html = htmlMatch[0].trim();
    } else {
      html = html
        .replace(/^```[\w-]*\s*\n?/i, '')
        .replace(/\n?```\s*$/, '')
        .trim();
    }

    return html;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generateExerciseHtml:', message);
    throw error;
  }
}

const PERFORMANCE_SUMMARY_SYSTEM_PROMPT = `You are a friendly coach. Given an exercise and its biomechanics, write 3–5 short, actionable tips to improve form. Focus on common mistakes and performance cues. Use plain language; avoid jargon. Output valid Markdown only: use ## for headings, ** for bold, numbered or bulleted lists. No HTML, no code blocks.`;

/**
 * Generates a post-tutorial performance summary (how to improve form).
 * Used when the user completes a Tutorial Lab session.
 * Uses same Vertex AI endpoint and model as Program/Challenge/Workout Factory.
 */
export async function generatePerformanceSummary(
  exerciseName: string,
  biomechanics?: ParsedBiomechanicsContext | null
): Promise<string> {
  const chain = biomechanics?.biomechanicalChain?.trim() || 'Not specified';
  const pivots = biomechanics?.pivotPoints?.trim() || 'Not specified';
  const stabilization = biomechanics?.stabilizationNeeds?.trim() || 'Not specified';
  const mistakes =
    (biomechanics?.commonMistakes?.length ?? 0) > 0
      ? biomechanics!.commonMistakes!.join('; ')
      : 'None specified';
  const cues =
    (biomechanics?.performanceCues?.length ?? 0) > 0
      ? biomechanics!.performanceCues!.join('; ')
      : 'None specified';

  const userPrompt = `Write a short "How to improve your ${exerciseName}" guide for someone who just completed a camera-based tutorial.

Context:
- Movement / chain: ${chain}
- Pivot points: ${pivots}
- Stabilization: ${stabilization}
- Common mistakes to address: ${mistakes}
- Performance cues (translate into tips): ${cues}

Output only the Markdown. Start with a brief intro (1 sentence), then 3–5 actionable tips.`;

  try {
    const creds = await getVertexAICredentials('[generatePerformanceSummary]');
    if ('error' in creds) {
      const text = await creds.error.text();
      throw new Error(text || 'Vertex AI credentials failed');
    }
    const { projectId, region, accessToken } = creds;
    let markdown = await callVertexAI({
      systemPrompt: PERFORMANCE_SUMMARY_SYSTEM_PROMPT,
      userPrompt,
      accessToken,
      projectId,
      region,
      maxTokens: 2048,
      logPrefix: '[generatePerformanceSummary]',
    });
    markdown = markdown.replace(/^```markdown\n?|\n?```$/g, '').trim();
    return markdown || `## Tips for ${exerciseName}\n\nPractice regularly and focus on the cues from the tutorial.`;
  } catch (error) {
    console.error('Error in generatePerformanceSummary:', error);
    throw error;
  }
}
