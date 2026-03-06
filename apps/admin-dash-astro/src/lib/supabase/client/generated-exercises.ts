/**
 * Client-side generated exercises for ExerciseMapPickerModal and approved-exercise-maps.
 */

import { supabase } from '../client';
import { toTimestampLike } from '@/types/timestamp';
import type {
  GeneratedExercise,
  CreateGeneratedExerciseInput,
  GeneratedExerciseStatus,
  ExerciseVideo,
  ParsedBiomechanics,
} from '@/types/generated-exercise';
import { normalizeExerciseName } from '@/lib/approved-exercise-maps';

function toDate(v: string | null | undefined): Date {
  if (!v) return new Date();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toTimestamp(d: Date) {
  return toTimestampLike(d);
}

interface GeneratedExerciseRow {
  id: string;
  slug: string;
  exercise_name: string;
  image_url: string | null;
  storage_path: string | null;
  kinetic_chain_type: string | null;
  biomechanics: Record<string, unknown> | null;
  image_prompt: string | null;
  complexity_level: string | null;
  visual_style: string | null;
  sources: unknown[] | null;
  status: string;
  generated_by: string;
  created_at: string | null;
  updated_at: string | null;
  generated_at: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  deep_dive_html_content: string | null;
  suitable_blocks: unknown[] | null;
  main_workout_type: string | null;
  video_url: string | null;
  video_storage_path: string | null;
  videos: unknown[] | null;
}

function mapRowToExercise(row: GeneratedExerciseRow): GeneratedExercise {
  const createdAt = toDate(row.created_at);
  const updatedAt = toDate(row.updated_at);
  const generatedAt = toDate(row.generated_at);
  const rejectedAt = row.rejected_at ? toDate(row.rejected_at) : undefined;
  return {
    id: row.id,
    slug: row.slug,
    exerciseName: row.exercise_name,
    imageUrl: row.image_url ?? '',
    storagePath: row.storage_path ?? '',
    kineticChainType: row.kinetic_chain_type ?? '',
    biomechanics: (row.biomechanics ?? {}) as unknown as ParsedBiomechanics,
    imagePrompt: row.image_prompt ?? '',
    complexityLevel: row.complexity_level ?? '',
    visualStyle: row.visual_style ?? '',
    sources: (row.sources ?? []) as GeneratedExercise['sources'],
    status: row.status as GeneratedExercise['status'],
    generatedBy: row.generated_by,
    generatedAt: toTimestamp(generatedAt),
    createdAt: toTimestamp(createdAt),
    updatedAt: toTimestamp(updatedAt),
    rejectedAt: rejectedAt ? toTimestamp(rejectedAt) : undefined,
    rejectedBy: row.rejected_by ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    deepDiveHtmlContent: row.deep_dive_html_content ?? undefined,
    suitableBlocks: (row.suitable_blocks ?? []) as GeneratedExercise['suitableBlocks'],
    mainWorkoutType: (row.main_workout_type ?? undefined) as GeneratedExercise['mainWorkoutType'],
    videoUrl: row.video_url ?? undefined,
    videoStoragePath: row.video_storage_path ?? undefined,
    videos: (row.videos ?? []) as GeneratedExercise['videos'],
  };
}

export async function getGeneratedExercises(
  statusFilter?: GeneratedExerciseStatus
): Promise<GeneratedExercise[]> {
  let q = supabase
    .from('generated_exercises')
    .select('*')
    .order('created_at', { ascending: false });
  if (statusFilter) q = q.eq('status', statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => mapRowToExercise(row as GeneratedExerciseRow));
}

export async function getGeneratedExerciseById(id: string): Promise<GeneratedExercise | null> {
  const { data, error } = await supabase
    .from('generated_exercises')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? mapRowToExercise(data) : null;
}

export async function getGeneratedExerciseBySlug(
  slug: string,
  statusFilter?: GeneratedExerciseStatus
): Promise<GeneratedExercise | null> {
  let q = supabase.from('generated_exercises').select('*').eq('slug', slug).limit(1);
  if (statusFilter) q = q.eq('status', statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return null;
  return mapRowToExercise(data[0]);
}
