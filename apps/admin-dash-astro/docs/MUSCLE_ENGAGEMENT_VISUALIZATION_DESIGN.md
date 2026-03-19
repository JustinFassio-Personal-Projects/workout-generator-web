# Muscle Engagement Visualization — Engineering Design

**Status:** Archived. The SVG-based diagram described here was replaced by an **AI-generated anatomical image** (see `generateAnatomicalMuscleImage` in `gemini-server.ts`, `POST /api/admin/exercises/[id]/generate-muscle-image`, and `injectMuscleDiagramImage` in `muscle-diagram-html.ts`). Muscle map data (`muscleEngagementMap`) is still generated and stored; it drives the anatomical image prompt. This document is retained for historical reference.

**Original goal:** Replace the unreliable AI-generated inline SVG diagram with an **accurate, consistent, and professional** muscle map by using **structured data + curated anatomical assets + deterministic rendering**.

---

## 1. Problem Summary

The Deep Dive page currently asks an LLM (Vertex AI) to generate the entire HTML document, including a “Muscle Engagement Visualization” section. The model is instructed to draw an anatomical figure with SVG `<path>` elements and no circles/rectangles, but in practice it often produces:

- A minimal stick-figure outline instead of a proper body silhouette
- Simple primitives (circles, rectangles, V-shapes) instead of anatomically accurate muscle paths
- Inconsistent quality and layout across exercises

**Root cause:** Relying on the model to generate vector art from text is inherently unreliable. There is no single source of truth for anatomy or layout.

---

## 2. Solution Overview

**Separate data from presentation:**

| Layer | Responsibility | Implementation |
|-------|----------------|----------------|
| **Data** | Which muscles are engaged and their role (primary / secondary / stabilizer) | AI outputs a **structured muscle list** (easy for the model). Stored in DB. |
| **Assets** | What the body and each muscle region look like | **Curated SVG(s)** with a fixed body outline and named muscle regions (drawn once, used everywhere). |
| **Renderer** | How to show the body and highlight the right muscles | **Deterministic component** that takes the muscle list + view (anterior/posterior) and composites the diagram from the assets. |

The AI no longer draws the diagram. It only returns a list of canonical muscle IDs and roles; the app renders the diagram from that list using fixed assets.

---

## 3. Data Model

### 3.1 Canonical muscle ID set

Define a fixed set of muscle identifiers that both the AI and the SVG assets use. Example (expand as needed):

| ID | Display name | Typical view |
|----|--------------|--------------|
| `pectoralis_major` | Pectoralis major | anterior |
| `anterior_deltoid` | Anterior deltoid | anterior |
| `lateral_deltoid` | Lateral deltoid | anterior / lateral |
| `posterior_deltoid` | Posterior deltoid | posterior |
| `rectus_abdominis` | Rectus abdominis | anterior |
| `external_obliques` | External obliques | anterior |
| `serratus_anterior` | Serratus anterior | anterior |
| `trapezius_upper` | Upper trapezius | anterior / posterior |
| `trapezius_mid` | Mid trapezius | posterior |
| `trapezius_lower` | Lower trapezius | posterior |
| `latissimus_dorsi` | Latissimus dorsi | posterior |
| `rhomboids` | Rhomboids | posterior |
| `erector_spinae` | Erector spinae | posterior |
| `biceps_brachii` | Biceps brachii | anterior |
| `triceps_brachii` | Triceps brachii | posterior |
| `brachialis` | Brachialis | anterior |
| `forearm_flexors` | Forearm flexors | anterior |
| `forearm_extensors` | Forearm extensors | posterior |
| `gluteus_maximus` | Gluteus maximus | posterior |
| `gluteus_medius` | Gluteus medius | lateral / posterior |
| `hip_flexors` | Hip flexors (iliopsoas, TFL) | anterior |
| `quadriceps` | Quadriceps | anterior |
| `hamstrings` | Hamstrings | posterior |
| `gastrocnemius` | Gastrocnemius | posterior |
| `soleus` | Soleus | posterior |
| `core_stabilizers` | Core (transverse abdominis, etc.) | anterior |

A full list should live in code (e.g. `MUSCLE_IDS` array or enum) and in the asset SVG layer IDs so the renderer can look up regions by ID.

### 3.2 Muscle engagement payload

Structure returned by the AI and stored per exercise:

```ts
type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

interface MuscleEngagementItem {
  id: string;   // canonical muscle ID from the set above
  role: MuscleRole;
}

interface MuscleEngagementMap {
  /** Which body view(s) to show. "both" => render anterior and posterior side-by-side. */
  view: 'anterior' | 'posterior' | 'both';
  muscles: MuscleEngagementItem[];
}
```

Example for a push-up:

```json
{
  "view": "anterior",
  "muscles": [
    { "id": "pectoralis_major", "role": "primary" },
    { "id": "anterior_deltoid", "role": "primary" },
    { "id": "triceps_brachii", "role": "primary" },
    { "id": "rectus_abdominis", "role": "stabilizer" },
    { "id": "serratus_anterior", "role": "stabilizer" }
  ]
}
```

### 3.3 Storage

- **Option A (recommended):** New column on `generated_exercises`:
  - `muscle_engagement_map` (JSONB, nullable).
- **Option B:** Embed in existing HTML as a `<script type="application/json" id="muscle-engagement-data">` and parse on display. Keeps a single “content” field but mixes structure with HTML and complicates editing.

Recommendation: **Option A**. Keeps muscle data queryable and avoids parsing HTML. Deep Dive HTML can then omit the “Muscle Engagement Visualization” block entirely (or leave a short note: “See diagram above”) so the page is composed as: **[Diagram component]** + **[Rest of deep dive HTML]**.

---

## 4. Anatomical Assets

### 4.1 Requirements

- **Two base figures:** Anterior and posterior body outline (silhouette), same scale and registration so muscle regions align.
- **One SVG per view** (or one SVG with two viewBoxes). Each figure contains:
  - **Base layer:** Body outline (stroke/fill) in neutral gray.
  - **Muscle layers:** One `<path>` or `<g>` per canonical muscle ID, with `id` matching the data model (e.g. `id="pectoralis_major"`). Paths should be anatomically plausible (fan for pecs, cap for delts, etc.).
- **No circles/rectangles for muscles;** use paths that reflect real anatomy.
- **Design for overlay:** Muscle paths will be filled with semi-transparent color by the renderer (e.g. primary = warm red, secondary = blue, stabilizer = muted). So asset paths should be closed shapes with no fill or a neutral fill that the app overrides.

### 4.2 Asset source options

- **Commission or buy:** Have a designer produce two SVGs (anterior/posterior) with named regions. License for use in the product.
- **Public domain / CC:** Use or adapt an existing anatomical SVG (e.g. from Wikipedia, NIH, or open illustration packs) and add/align the region IDs to match `MUSCLE_IDS`.
- **In-house:** Draw in Illustrator/Figma, export SVG, ensure each region has the correct `id`.

### 4.3 File placement

- e.g. `apps/admin-dash-astro/src/assets/anatomy/` or a shared package:
  - `body-anterior.svg`
  - `body-posterior.svg`
- Or a single SVG with two views and `<symbol>`/`<use>` for reuse.

---

## 5. Renderer Component

### 5.1 API

- **Input:** `MuscleEngagementMap` (view + list of muscle IDs and roles).
- **Behavior:**
  - Choose anterior and/or posterior SVG based on `view`.
  - For each muscle in `muscles`, find the matching element in the SVG (by `id`) and set fill (and optionally stroke) to a color by `role` (e.g. primary: `rgba(220, 38, 38, 0.5)`, secondary: `rgba(59, 130, 246, 0.45)`, stabilizer: `rgba(107, 114, 128, 0.4)`).
  - Preserve aspect ratio; make the SVG responsive (e.g. `viewBox`, `preserveAspectRatio`, `max-width: 100%`).
- **Output:** Accessible (e.g. `role="img"`, `aria-label` listing the muscles shown).

### 5.2 Where it runs

- **Admin Deep Dive view:** Page fetches exercise (including `muscle_engagement_map`). Renders the diagram component above or beside the iframe that shows the rest of the deep dive HTML.
- **Public Learn page (programs app):** Same idea: fetch exercise with `muscle_engagement_map`; render diagram in the page layout, then the sanitized HTML for the rest of the content (or iframe). Requires programs app to have the same (or shared) component and assets.

### 5.3 Fallback

- If `muscle_engagement_map` is null or empty, show nothing or a short “Muscle map not generated” message. No need to fall back to the old AI-drawn block.

---

## 6. AI / Generate-Page Changes

### 6.1 Two outputs from one flow (recommended)

- **Generate-page API** calls the AI with an updated prompt that:
  1. Asks for **structured muscle engagement** only (e.g. JSON: `view` + `muscles[]` with `id` and `role`). Use a strict schema and canonical IDs in the prompt so the model picks from the list.
  2. Asks for **Deep Dive HTML** that **does not** include any “Muscle Engagement Visualization” SVG/diagram; the section can say “Muscles engaged are shown in the diagram above” or be omitted.
- **API** then:
  - Parses and validates the muscle JSON (discard invalid IDs).
  - Saves `muscle_engagement_map` to the new column.
  - Saves the HTML to `deep_dive_html_content` as today.

### 6.2 Alternative: two-step generation

- **Step 1:** Existing `generate-page` produces HTML only; prompt updated to not draw the diagram.
- **Step 2:** New endpoint or same endpoint with a “muscle map only” mode: AI returns only the muscle list JSON; save to `muscle_engagement_map`. Allows regenerating the diagram without regenerating the full page.

Either way, the AI **never** draws SVG; it only returns a list of canonical muscle IDs and roles.

---

## 7. Implementation Phases

| Phase | Deliverable |
|-------|-------------|
| **1. Data & schema** | Define `MUSCLE_IDS` and TypeScript types; add `muscle_engagement_map` (JSONB) to `generated_exercises`; migration; update admin (and programs) types/client to read/write the field. |
| **2. Assets** | Obtain or create anterior + posterior SVG with named muscle regions; add to repo; document ID ↔ muscle mapping. |
| **3. Renderer** | Build the React (or Astro) component that takes `MuscleEngagementMap`, loads the SVG(s), and highlights regions by role; use in admin Deep Dive view. |
| **4. Generate flow** | Update Deep Dive system prompt to output muscle JSON (and HTML without diagram); update generate-page to parse, validate, and save `muscle_engagement_map`. |
| **5. Public Learn** | Use same component and assets in programs app Learn page; fetch `muscle_engagement_map` and render diagram in layout. |
| **6. Optional** | DeepDiveEditor: allow editing the muscle list (add/remove muscles, change role) and re-save `muscle_engagement_map`. |

---

## 8. Success Criteria

- **Accurate:** Muscle regions match real anatomy (one-time quality from assets).
- **Consistent:** Same look and behavior for every exercise; only the set of highlighted muscles changes.
- **Professional:** Clean silhouette, readable labels/legend, accessible, responsive.

---

## 9. Related

- [EXERCISE_DEEP_DIVE_WORKFLOW.md](/docs/EXERCISE_DEEP_DIVE_WORKFLOW.md) — Flow from create → approve → generate → publish.
- [programs/docs/features/exercises/deep-dive-page.md](/apps/programs/docs/features/exercises/deep-dive-page.md) — Deep dive page design and `deepDiveHtmlContent`.
- Current Deep Dive prompt: `apps/admin-dash-astro/src/lib/gemini-server.ts` (`DEEP_DIVE_SYSTEM_PROMPT`, `generateExerciseHtml`).
