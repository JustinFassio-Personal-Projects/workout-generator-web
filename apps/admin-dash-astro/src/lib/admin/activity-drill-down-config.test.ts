/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  getActivityJourneyListActions,
  getDrillDownConfig,
  resolveRowTimelineTarget,
  type ActivityLogRow,
} from './activity-drill-down-config';

function baseRow(overrides: Partial<ActivityLogRow> = {}): ActivityLogRow {
  return {
    id: 'doc1',
    timestamp: '2026-01-01T00:00:00.000Z',
    action: 'workout:open',
    user_id: 'u1',
    session_id: null,
    resource_id: null,
    workout_attempt_id: null,
    generation_id: null,
    details: {},
    ...overrides,
  };
}

describe('activity-drill-down-config', () => {
  it('getActivityJourneyListActions returns only enabled activity_journey_list actions in registry order', () => {
    expect(getActivityJourneyListActions()).toEqual([
      'workout:generate',
      'workout:open',
      'workout:complete',
      'recipe:view',
      'app:session_start',
    ]);
  });

  it('resolveRowTimelineTarget for workout:open prefers generation_id over workout_attempt_id', () => {
    const cfg = getDrillDownConfig('workout:open');
    expect(cfg).toBeDefined();
    const row = baseRow({
      generation_id: 'gen-1',
      workout_attempt_id: 'att-1',
    });
    expect(resolveRowTimelineTarget(cfg!, row)).toEqual({
      kind: 'generation_id',
      id: 'gen-1',
    });
  });

  it('resolveRowTimelineTarget for workout:open falls back to attempt when no generation_id', () => {
    const cfg = getDrillDownConfig('workout:open');
    expect(cfg).toBeDefined();
    const row = baseRow({ workout_attempt_id: 'att-2' });
    expect(resolveRowTimelineTarget(cfg!, row)).toEqual({ kind: 'attempt', id: 'att-2' });
  });

  it('resolveRowTimelineTarget for workout:open returns null when neither id is present', () => {
    const cfg = getDrillDownConfig('workout:open');
    expect(cfg).toBeDefined();
    expect(resolveRowTimelineTarget(cfg!, baseRow())).toBeNull();
  });
});
