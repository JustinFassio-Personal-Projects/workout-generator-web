/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  sortHubUsersBySignupDesc,
  signupMsFromPipelineRow,
  type FirestorePipelineUser,
} from './pipeline-users-firestore';

function row(
  partial: Partial<FirestorePipelineUser> & Pick<FirestorePipelineUser, 'id'>
): FirestorePipelineUser {
  return {
    email: null,
    displayName: null,
    growthState: null,
    trialEndsAt: null,
    purchasedIndex: null,
    createdAt: null,
    ...partial,
  };
}

describe('Hub admin snapshot helpers', () => {
  it('sortHubUsersBySignupDesc puts newest signup first and null createdAt last', () => {
    const older = row({ id: 'older', createdAt: '2026-03-30T10:00:00.000Z' });
    const newer = row({ id: 'newer', createdAt: '2026-03-31T10:00:00.000Z' });
    const noDate = row({ id: 'nodate', createdAt: null });
    const sorted = sortHubUsersBySignupDesc([older, noDate, newer]);
    expect(sorted.map((r) => r.id)).toEqual(['newer', 'older', 'nodate']);
  });

  it('sortHubUsersBySignupDesc tie-breaks equal ms by id', () => {
    const same = '2026-03-30T10:00:00.000Z';
    const b = row({ id: 'b', createdAt: same });
    const a = row({ id: 'a', createdAt: same });
    const sorted = sortHubUsersBySignupDesc([b, a]);
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('signupMsFromPipelineRow returns null when createdAt missing', () => {
    expect(signupMsFromPipelineRow(row({ id: 'x', createdAt: null }))).toBeNull();
  });

  it('signupMsFromPipelineRow parses ISO createdAt', () => {
    const iso = '2026-01-15T12:00:00.000Z';
    expect(signupMsFromPipelineRow(row({ id: 'x', createdAt: iso }))).toBe(Date.parse(iso));
  });

  it('stats-relevant ms count matches rows with non-null signup ms', () => {
    const rows = [
      row({ id: '1', createdAt: '2026-03-01T00:00:00.000Z' }),
      row({ id: '2', createdAt: null }),
      row({ id: '3', createdAt: '2026-03-02T00:00:00.000Z' }),
    ];
    const timesMs = rows
      .map((r) => signupMsFromPipelineRow(r))
      .filter((ms): ms is number => ms !== null);
    expect(timesMs).toHaveLength(2);
  });
});
