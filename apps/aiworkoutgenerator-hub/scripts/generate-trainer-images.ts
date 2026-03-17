/**
 * Script to generate AI trainer portrait images using Vertex AI Imagen.
 *
 * This script generates professional portrait images for all 6 AI trainers
 * and stores them in Firebase Storage, updating the Firestore documents.
 *
 * Usage:
 *   npx tsx scripts/generate-trainer-images.ts
 *
 * Requirements:
 *   - GOOGLE_CLOUD_PROJECT_ID: GCP project with Vertex AI API enabled
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON: Service account credentials JSON
 *   - Firebase Admin SDK configured
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { GoogleAuth } from "google-auth-library";
import { TRAINERS, type TrainerSeedData } from "../src/types/trainer";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson);
    initializeApp({
      credential: cert(credentials),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } else {
    initializeApp();
  }
}

const db = getFirestore();

// ============================================
// Trainer Portrait Prompts
// ============================================

interface TrainerPortraitConfig {
  id: string;
  prompt: string;
  negativePrompt: string;
}

/**
 * Generate optimized prompts for each trainer's portrait.
 * These prompts are designed to create professional, consistent trainer portraits.
 */
function getTrainerPortraitConfigs(): TrainerPortraitConfig[] {
  return TRAINERS.map((trainer) => ({
    id: trainer.id,
    prompt: buildTrainerPortraitPrompt(trainer),
    negativePrompt: buildNegativePrompt(),
  }));
}

/**
 * Build a portrait prompt for a specific trainer.
 */
function buildTrainerPortraitPrompt(trainer: TrainerSeedData): string {
  const trainerPrompts: Record<string, string> = {
    marcus_chen: `
Professional portrait photography of an Asian-American male fitness coach in his early 30s.
Athletic build, calm and confident expression.
Wearing a dark fitted athletic shirt.
Clean gym studio background with soft professional lighting.
Arms crossed or hands on hips, authoritative but approachable stance.
High-quality headshot style, sharp focus on face.
Color palette: blues and grays.
Style: Professional fitness industry portrait, LinkedIn quality.
`.trim(),

    rivera_santos: `
Professional portrait photography of a Latina female athlete in her late 20s.
Dynamic energy, bright genuine smile, athletic build.
Wearing orange or coral colored athletic top.
Motion blur or active pose suggesting movement and energy.
Clean modern gym background with warm lighting.
High-quality portrait, sharp focus.
Color palette: oranges and warm tones.
Style: Energetic fitness influencer portrait, magazine quality.
`.trim(),

    alex_kim: `
Professional portrait photography of a Korean-American person in their 30s with a serene, mindful expression.
Androgynous appearance, peaceful demeanor.
Wearing a soft purple or lavender yoga top.
Zen studio or nature-inspired background with soft diffused lighting.
Meditation pose or gentle hand gesture.
High-quality portrait, soft focus creating calm atmosphere.
Color palette: purples and lavenders.
Style: Wellness and mindfulness portrait, spa brochure quality.
`.trim(),

    jordan_williams: `
Professional portrait photography of a Black male athlete in his early 30s.
Athletic build, adventurous and resourceful expression.
Wearing a green athletic shirt or tank top.
Outdoor setting or minimalist background suggesting travel and adventure.
Confident stance, perhaps with backpack strap visible.
High-quality portrait, natural lighting.
Color palette: greens and earth tones.
Style: Adventure fitness portrait, outdoor magazine quality.
`.trim(),

    elena_popov: `
Professional portrait photography of an Eastern European female in her late 30s.
Elegant and poised, dancer's posture and grace.
Wearing a pink or rose colored Pilates outfit.
Clean studio background with soft, flattering lighting.
Graceful pose suggesting precision and control.
High-quality portrait, studio lighting.
Color palette: pinks and rose tones.
Style: Elegant fitness portrait, dance studio quality.
`.trim(),

    ryder_cross: `
Professional portrait photography of a Caucasian male CrossFit athlete in his late 20s.
Intense expression, competitive energy, muscular build.
Wearing a red or dark red athletic shirt.
CrossFit gym or industrial-style fitness background.
Power stance, perhaps mid-workout or holding equipment.
High-quality portrait, dramatic lighting.
Color palette: reds and dark tones.
Style: Intense fitness portrait, competition athlete quality.
`.trim(),
  };

  return (
    trainerPrompts[trainer.id] ||
    `Professional portrait photography of a fitness trainer. Clean background, professional lighting.`
  );
}

/**
 * Build a negative prompt to avoid common AI image issues.
 */
function buildNegativePrompt(): string {
  return [
    "cartoon",
    "anime",
    "illustration",
    "3D render",
    "unrealistic",
    "distorted",
    "blurry",
    "low quality",
    "watermark",
    "text",
    "logo",
    "deformed",
    "ugly",
    "bad anatomy",
    "extra limbs",
    "mutated hands",
    "poorly drawn face",
  ].join(", ");
}

// ============================================
// Image Generation
// ============================================

interface ImagenConfig {
  model: string;
  aspectRatio: string;
  sampleCount: number;
}

const IMAGEN_CONFIG: ImagenConfig = {
  model: "imagen-3.0-generate-002",
  aspectRatio: "1:1",
  sampleCount: 1,
};

/**
 * Generate an image using Vertex AI Imagen.
 */
async function generateImageWithImagen(
  prompt: string,
  negativePrompt: string
): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT_ID environment variable not set");
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not configured");
  }

  const credentials = JSON.parse(credentialsJson);
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new Error("Failed to get access token");
  }

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${IMAGEN_CONFIG.model}:predict`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: IMAGEN_CONFIG.sampleCount,
      aspectRatio: IMAGEN_CONFIG.aspectRatio,
      negativePrompt,
      personGeneration: "allow_adult",
    },
  };

  console.log(`  Calling Imagen API...`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Imagen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.predictions || data.predictions.length === 0) {
    throw new Error("No image generated - may have been safety filtered");
  }

  const base64Image = data.predictions[0].bytesBase64Encoded;
  if (!base64Image) {
    throw new Error("Invalid image data received");
  }

  return base64Image;
}

/**
 * Upload base64 image to Firebase Storage.
 */
async function uploadToFirebaseStorage(
  base64Data: string,
  storagePath: string
): Promise<string> {
  const bucket = getStorage().bucket();
  const buffer = Buffer.from(base64Data, "base64");
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

/**
 * Update trainer document with new image URL.
 */
async function updateTrainerImage(
  trainerId: string,
  imageUrl: string
): Promise<void> {
  const trainerRef = db.collection("trainers").doc(trainerId);
  await trainerRef.update({
    imageUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ============================================
// Main Script
// ============================================

async function generateTrainerImages() {
  console.log("🎨 Generating AI Trainer Portrait Images\n");

  const configs = getTrainerPortraitConfigs();
  const results: {
    trainerId: string;
    success: boolean;
    url?: string;
    error?: string;
  }[] = [];

  for (const config of configs) {
    const trainer = TRAINERS.find((t) => t.id === config.id);
    if (!trainer) continue;

    console.log(
      `\n📸 Generating portrait for ${trainer.name} "${trainer.nickname}"...`
    );

    try {
      // Generate the image
      const base64Image = await generateImageWithImagen(
        config.prompt,
        config.negativePrompt
      );

      // Upload to Firebase Storage
      const timestamp = Date.now();
      const storagePath = `trainers/${trainer.id}_${timestamp}.png`;
      console.log(`  Uploading to Firebase Storage...`);
      const imageUrl = await uploadToFirebaseStorage(base64Image, storagePath);

      // Update Firestore
      console.log(`  Updating Firestore document...`);
      await updateTrainerImage(trainer.id, imageUrl);

      results.push({ trainerId: trainer.id, success: true, url: imageUrl });
      console.log(`  ✅ Success: ${imageUrl}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({
        trainerId: trainer.id,
        success: false,
        error: errorMessage,
      });
      console.error(`  ❌ Failed: ${errorMessage}`);
    }

    // Add a small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 GENERATION SUMMARY");
  console.log("=".repeat(50));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach((r) => {
    const trainer = TRAINERS.find((t) => t.id === r.trainerId);
    console.log(`   - ${trainer?.name}: ${r.url}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach((r) => {
      const trainer = TRAINERS.find((t) => t.id === r.trainerId);
      console.log(`   - ${trainer?.name}: ${r.error}`);
    });
  }

  console.log("\n");
}

async function main() {
  try {
    await generateTrainerImages();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
