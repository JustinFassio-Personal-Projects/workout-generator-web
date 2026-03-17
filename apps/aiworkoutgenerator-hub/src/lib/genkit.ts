import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

/**
 * Genkit AI instance configured with Google AI (Gemini) plugin.
 *
 * Usage:
 * - Import this instance in flows and API routes
 * - Use ai.generate() for direct generation
 * - Use ai.defineFlow() to create reusable flows
 *
 * Environment Variables Required:
 * - GOOGLE_AI_API_KEY: Your Google AI API key from https://aistudio.google.com/
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    }),
  ],
});

/**
 * Default model configuration for workout generation.
 * Using gemini-2.0-flash for fast, cost-effective generation.
 */
export const DEFAULT_MODEL = "googleai/gemini-2.0-flash";

/**
 * Fallback model if the default is unavailable.
 */
export const FALLBACK_MODEL = "googleai/gemini-1.5-flash";

/**
 * Available Gemini models for workout generation.
 * Models are listed in order of recommendation (fastest/cheapest first).
 */
export const AVAILABLE_MODELS = [
  {
    value: "googleai/gemini-2.0-flash",
    label: "Gemini 2.0 Flash (Default - Fast)",
  },
  {
    value: "googleai/gemini-3-pro",
    label: "Gemini 3 Pro (Higher Quality)",
  },
  {
    value: "googleai/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
  },
  {
    value: "googleai/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
  },
  {
    value: "googleai/gemini-3-flash",
    label: "Gemini 3 Flash",
  },
  {
    value: "googleai/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
  },
  {
    value: "googleai/gemini-1.5-flash",
    label: "Gemini 1.5 Flash (Fallback)",
  },
  {
    value: "googleai/gemini-2.0-flash-exp",
    label: "Gemini 2.0 Flash Exp (Experimental)",
  },
] as const;
