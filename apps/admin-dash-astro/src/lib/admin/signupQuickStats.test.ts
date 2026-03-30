/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  computeSignupQuickStats,
  computeSignupQuickStatsFromMs,
  parseSignupTimeMs,
  pctChange,
  startOfLocalDay,
  startOfLocalMonth,
  startOfWeekMonday,
  subtractMonthsPreserveClock,
} from './signupQuickStats';

const users = (dates: string[]) => dates.map((createdAt) => ({ createdAt }));

describe('signupQuickStats', () => {
  const prevTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = 'UTC';
  });
  afterAll(() => {
    process.env.TZ = prevTz;
  });

  it('startOfWeekMonday returns Monday 00:00 in zone (UTC)', () => {
    // Wednesday 2026-04-01 15:00 UTC
    const now = new Date(Date.UTC(2026, 3, 1, 15, 0, 0));
    const mon = startOfWeekMonday(now, 'UTC');
    expect(mon.getUTCDay()).toBe(1);
    expect(mon.toISOString()).toBe('2026-03-30T00:00:00.000Z');
  });

  it('subtractMonthsPreserveClock clamps Mar 31 to Feb last day (UTC zone)', () => {
    const mar31 = new Date(Date.UTC(2026, 2, 31, 18, 30, 0));
    const feb = subtractMonthsPreserveClock(mar31, 1, 'UTC');
    expect(feb.toISOString()).toBe('2026-02-28T18:30:00.000Z');
  });

  it('subtractMonthsPreserveClock keeps Jan 15 -> Dec 15 prior year (UTC zone)', () => {
    const jan = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
    const dec = subtractMonthsPreserveClock(jan, 1, 'UTC');
    expect(dec.toISOString()).toBe('2025-12-15T12:00:00.000Z');
  });

  it('pctChange returns null when previous is 0', () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });

  it('pctChange divides when previous > 0', () => {
    expect(pctChange(3, 2)).toBe(50);
    expect(pctChange(1, 2)).toBe(-50);
  });

  it('computeSignupQuickStats: WTD and prior WTD windows (Monday noon UTC)', () => {
    // 2026-03-30 is Monday
    const now = new Date(Date.UTC(2026, 2, 30, 12, 0, 0));
    const u = users([
      '2026-03-30T10:00:00.000Z', // this week + today + March MTD
      '2026-03-23T11:00:00.000Z', // prior WTD only (Mon Mar 23 00:00 .. Mar 23 12:00)
      '2026-03-01T08:00:00.000Z', // March MTD only (not this week if week starts Mar 30)
    ]);

    const s = computeSignupQuickStats(u, now, { timeZone: 'UTC' });

    expect(s.today).toBe(1);
    expect(s.wtd.count).toBe(1);
    expect(s.wtd.pctVsPrev).toBe(0); // 1 vs 1

    expect(s.mtd.count).toBe(3);
  });

  it('computeSignupQuickStats: prior MTD and percentage', () => {
    const now = new Date(Date.UTC(2026, 2, 30, 12, 0, 0));
    const u = users([
      '2026-03-30T10:00:00.000Z',
      '2026-03-29T10:00:00.000Z',
      '2026-02-10T10:00:00.000Z', // inside prior MTD (Feb 1 .. Feb 28 12:00 same-offset)
    ]);

    const s = computeSignupQuickStats(u, now, { timeZone: 'UTC' });

    expect(s.mtd.count).toBe(2);
    expect(s.mtd.pctVsPrev).toBe(100); // 2 vs 1
  });

  it('computeSignupQuickStatsFromMs matches computeSignupQuickStats for same instants', () => {
    const now = new Date(Date.UTC(2026, 2, 30, 12, 0, 0));
    const u = users(['2026-03-30T10:00:00.000Z', '2026-03-23T11:00:00.000Z']);
    const ms = u.map((row) => Date.parse(row.createdAt));
    const a = computeSignupQuickStats(u, now, { timeZone: 'UTC' });
    const b = computeSignupQuickStatsFromMs(ms, now, { timeZone: 'UTC' });
    expect(b).toEqual(a);
  });

  it('startOfLocalMonth aligns with UTC when TZ=UTC', () => {
    const d = new Date(Date.UTC(2026, 2, 15, 8, 0, 0));
    expect(startOfLocalMonth(d, 'UTC').toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(startOfLocalDay(d, 'UTC').toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('parseSignupTimeMs parses ISO and returns null for garbage', () => {
    expect(parseSignupTimeMs('2026-03-30T10:00:00.000Z')).toBe(
      Date.parse('2026-03-30T10:00:00.000Z')
    );
    expect(parseSignupTimeMs('')).toBeNull();
    expect(parseSignupTimeMs('not-a-date')).toBeNull();
  });

  it('America/Los_Angeles today excludes UTC instant still on prior PT calendar date', () => {
    // Mar 30 2026 06:00 UTC = Mar 29 23:00 PDT; PT "today" Mar 30 starts 07:00 UTC.
    const now = new Date('2026-03-30T19:00:00.000Z');
    const timesMs = [Date.parse('2026-03-30T06:00:00.000Z')];
    const la = computeSignupQuickStatsFromMs(timesMs, now, { timeZone: 'America/Los_Angeles' });
    const utc = computeSignupQuickStatsFromMs(timesMs, now, { timeZone: 'UTC' });
    expect(la.today).toBe(0);
    expect(utc.today).toBe(1);
  });
});
