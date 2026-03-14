/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side workout insight persistence.
 * Upserts by user_workout_log_id (one insight per session).
 */

import { supabase } from '../client';

export interface SaveWorkoutInsightParams {
  sessionId: string;
  heartRate: number;
  minutesSinceLastSet?: number;
  notes?: string;
  insightText: string;
}

/**
 * Save or overwrite workout insight for a session.
 * Requires authenticated user; RLS enforces ownership.
 */
export async function saveWorkoutInsight(params: SaveWorkoutInsightParams): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const payload = {
    user_id: user.id,
    user_workout_log_id: params.sessionId,
    heart_rate: params.heartRate,
    minutes_since_last_set: params.minutesSinceLastSet ?? null,
    notes: params.notes ?? null,
    insight_text: params.insightText,
  };

  const { error } = await supabase
    .from('workout_insights')
    .upsert(payload, {
      onConflict: 'user_workout_log_id',
    });

  if (error) throw error;
}
