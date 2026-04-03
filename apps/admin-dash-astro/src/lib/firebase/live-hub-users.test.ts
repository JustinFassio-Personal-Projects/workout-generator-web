/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { aggregateLiveUsersFromLogRows, LIVE_HUB_MAX_ACTIONS_PER_USER } from './live-hub-users';
import type { WorkoutActivityLogRow } from './workout-journey';

function row(
  partial: Partial<WorkoutActivityLogRow> & Pick<WorkoutActivityLogRow, 'id' | 'timestamp' | 'action' | 'user_id'>
): WorkoutActivityLogRow {
  return {
    session_id: null,
    resource_id: null,
    workout_attempt_id: null,
    generation_id: null,
    details: {},
    ...partial,
  };
}

describe('aggregateLiveUsersFromLogRows', () => {
  it('skips rows without user_id', () => {
    const { distinctUserCount, users } = aggregateLiveUsersFromLogRows(
      [
        row({
          id: '1',
          timestamp: '2026-04-04T12:00:00.000Z',
          action: 'app:open',
          user_id: null,
        }),
        row({
          id: '2',
          timestamp: '2026-04-04T11:59:00.000Z',
          action: 'app:open',
          user_id: '  ',
        }),
        row({
          id: '3',
          timestamp: '2026-04-04T11:58:00.000Z',
          action: 'app:open',
          user_id: 'u1',
        }),
      ],
      25
    );
    expect(distinctUserCount).toBe(1);
    expect(users).toHaveLength(1);
    expect(users[0].user_id).toBe('u1');
  });

  it('keeps at most three most recent actions per user (scan is newest-first)', () => {
    const { users } = aggregateLiveUsersFromLogRows(
      [
        row({
          id: 'a',
          timestamp: '2026-04-04T12:03:00.000Z',
          action: 'workout:start',
          user_id: 'u1',
          session_id: 'sess-latest',
        }),
        row({
          id: 'b',
          timestamp: '2026-04-04T12:02:00.000Z',
          action: 'workout:open',
          user_id: 'u1',
        }),
        row({
          id: 'c',
          timestamp: '2026-04-04T12:01:00.000Z',
          action: 'app:open',
          user_id: 'u1',
        }),
        row({
          id: 'd',
          timestamp: '2026-04-04T12:00:00.000Z',
          action: 'app:session_start',
          user_id: 'u1',
        }),
      ],
      25
    );
    expect(users).toHaveLength(1);
    expect(users[0].recent_actions).toHaveLength(LIVE_HUB_MAX_ACTIONS_PER_USER);
    expect(users[0].recent_actions.map((x) => x.action)).toEqual([
      'workout:start',
      'workout:open',
      'app:open',
    ]);
    expect(users[0].session_id).toBe('sess-latest');
    expect(users[0].last_seen).toBe('2026-04-04T12:03:00.000Z');
  });

  it('sorts users by last_seen descending and caps maxUsers', () => {
    const { distinctUserCount, users } = aggregateLiveUsersFromLogRows(
      [
        row({
          id: '1',
          timestamp: '2026-04-04T12:00:00.000Z',
          action: 'x',
          user_id: 'older',
        }),
        row({
          id: '2',
          timestamp: '2026-04-04T13:00:00.000Z',
          action: 'x',
          user_id: 'newer',
        }),
      ],
      1
    );
    expect(distinctUserCount).toBe(2);
    expect(users).toHaveLength(1);
    expect(users[0].user_id).toBe('newer');
  });
});
