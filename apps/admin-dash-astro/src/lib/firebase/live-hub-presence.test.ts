/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { getUserPresenceCollectionName } from './live-hub-presence';

describe('live-hub-presence', () => {
  it('getUserPresenceCollectionName returns a non-empty identifier', () => {
    const name = getUserPresenceCollectionName();
    expect(name.length).toBeGreaterThan(0);
  });
});
