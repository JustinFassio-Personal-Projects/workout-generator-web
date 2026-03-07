/**
 * Build approved-exercise maps from GeneratedExercise list for ProgramBlueprintEditor.
 */

import type { Exercise, ExtendedBiomechanics } from '@/types';
import type { GeneratedExercise } from '@/types/generated-exercise';
import { parseBiomechanicalPoints, FULL_BIOMECHANICS_CARD_LENGTH } from '@/lib/parse-biomechanics';

export function normalizeExerciseName(name: string): string {
  return name.toLowerCase().trim();
}

export interface ApprovedExerciseMaps {
  exerciseMap: Map<string, Exercise>;
  extendedMap: Map<string, ExtendedBiomechanics>;
  slugMap: Map<string, string>;
}

export function buildApprovedExerciseMaps(list: GeneratedExercise[]): ApprovedExerciseMaps {
  const exerciseMap = new Map<string, Exercise>();
  const extendedMap = new Map<string, ExtendedBiomechanics>();
  const slugMap = new Map<string, string>();

  list.forEach((genEx) => {
    const key = normalizeExerciseName(genEx.exerciseName);
    slugMap.set(key, genEx.slug);

    const rawCues = (genEx.biomechanics as { performanceCues?: string[] } | null)?.performanceCues ?? [];
    let instructions: string[];
    let extended: ExtendedBiomechanics | undefined;

    if (rawCues.length >= FULL_BIOMECHANICS_CARD_LENGTH) {
      try {
        const parsed = parseBiomechanicalPoints(rawCues);
        instructions =
          parsed.biomechanics.performanceCues.length > 0
            ? parsed.biomechanics.performanceCues
            : [rawCues[FULL_BIOMECHANICS_CARD_LENGTH - 1]];
        extended = {
          biomechanicalChain: parsed.biomechanics.biomechanicalChain || undefined,
          pivotPoints: parsed.biomechanics.pivotPoints || undefined,
          stabilizationNeeds: parsed.biomechanics.stabilizationNeeds || undefined,
          commonMistakes:
            (parsed.biomechanics.commonMistakes?.length ?? 0) > 0
              ? parsed.biomechanics.commonMistakes
              : undefined,
        };
      } catch {
        instructions = rawCues;
        extended = genEx.biomechanics
          ? {
              biomechanicalChain: (genEx.biomechanics as ParsedLike).biomechanicalChain,
              pivotPoints: (genEx.biomechanics as ParsedLike).pivotPoints,
              stabilizationNeeds: (genEx.biomechanics as ParsedLike).stabilizationNeeds,
              commonMistakes: (genEx.biomechanics as ParsedLike).commonMistakes,
            }
          : undefined;
      }
    } else {
      instructions = rawCues;
      extended = genEx.biomechanics
        ? {
            biomechanicalChain: (genEx.biomechanics as ParsedLike).biomechanicalChain,
            pivotPoints: (genEx.biomechanics as ParsedLike).pivotPoints,
            stabilizationNeeds: (genEx.biomechanics as ParsedLike).stabilizationNeeds,
            commonMistakes: (genEx.biomechanics as ParsedLike).commonMistakes,
          }
        : undefined;
    }

    const primaryVideoUrl =
      genEx.videos && genEx.videos.length > 0
        ? (genEx.videos.find((v) => !v.hidden) ?? genEx.videos[0])?.videoUrl
        : genEx.videoUrl;
    exerciseMap.set(key, {
      name: genEx.exerciseName,
      images: genEx.imageUrl ? [genEx.imageUrl] : [],
      instructions,
      ...(primaryVideoUrl && { videoUrl: primaryVideoUrl }),
    });
    if (extended) extendedMap.set(key, extended);
  });

  return { exerciseMap, extendedMap, slugMap };
}

interface ParsedLike {
  biomechanicalChain?: string;
  pivotPoints?: string;
  stabilizationNeeds?: string;
  commonMistakes?: string[];
}
