/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  getStartOfPacificCalendarDayUtc,
  LIVE_HUB_ACTIVITY_TIMEZONE,
} from './live-hub-pacific-day';

describe('getStartOfPacificCalendarDayUtc', () => {
  it('uses America/Los_Angeles (exported for API responses)', () => {
    expect(LIVE_HUB_ACTIVITY_TIMEZONE).toBe('America/Los_Angeles');
  });

  it('maps a summer UTC instant to midnight PDT on the same local calendar date', () => {
    // 2026-07-15 10:00 UTC = 03:00 PDT — still "July 15" in LA
    const ref = new Date('2026-07-15T10:00:00.000Z');
    const start = getStartOfPacificCalendarDayUtc(ref);
    expect(start.toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });

  it('uses the previous calendar day in LA when UTC is still "tomorrow" morning', () => {
    // 2026-07-15 06:00 UTC = 2026-07-14 23:00 PDT — LA date is July 14
    const ref = new Date('2026-07-15T06:00:00.000Z');
    const start = getStartOfPacificCalendarDayUtc(ref);
    expect(start.toISOString()).toBe('2026-07-14T07:00:00.000Z');
  });

  it('uses standard-time offset in January (PST)', () => {
    // 2026-01-15 18:00 UTC = 10:00 PST — same calendar day in LA
    const ref = new Date('2026-01-15T18:00:00.000Z');
    const start = getStartOfPacificCalendarDayUtc(ref);
    expect(start.toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });
});
