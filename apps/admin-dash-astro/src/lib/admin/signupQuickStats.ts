/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Signup quick stats: Hub `created_at` (ms) or Supabase rows; calendar boundaries in an IANA TZ.
 */

import { startOfDay, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

import type { UserProfile } from '@/types/admin-users';

export interface SignupQuickStats {
  today: number;
  wtd: { count: number; pctVsPrev: number | null };
  mtd: { count: number; pctVsPrev: number | null };
}

export type SignupQuickStatsOptions = {
  /** IANA zone for “today”, week, and month boundaries (default: America/Los_Angeles via env). */
  timeZone?: string;
};

function defaultTimeZone(opts?: SignupQuickStatsOptions): string {
  if (opts?.timeZone && opts.timeZone.trim()) return opts.timeZone.trim();
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_ADMIN_STATS_TIMEZONE) {
    const z = String(import.meta.env.PUBLIC_ADMIN_STATS_TIMEZONE).trim();
    if (z) return z;
  }
  return 'America/Los_Angeles';
}

function startOfZonedDay(date: Date, timeZone: string): Date {
  const z = toZonedTime(date, timeZone);
  return fromZonedTime(startOfDay(z), timeZone);
}

/** Monday 00:00 in `timeZone` (ISO week-style). */
function startOfZonedWeekMonday(date: Date, timeZone: string): Date {
  const z = toZonedTime(date, timeZone);
  const mondayLocal = startOfWeek(z, { weekStartsOn: 1 });
  return fromZonedTime(startOfDay(mondayLocal), timeZone);
}

function startOfZonedMonth(date: Date, timeZone: string): Date {
  const z = toZonedTime(date, timeZone);
  return fromZonedTime(startOfDay(startOfMonth(z)), timeZone);
}

/**
 * Same calendar instant one month earlier in `timeZone`, with day clamping (e.g. Mar 31 → Feb 28).
 */
function subtractMonthsPreserveClockZoned(date: Date, months: number, timeZone: string): Date {
  const z = toZonedTime(date, timeZone);
  return fromZonedTime(subMonths(z, months), timeZone);
}

/** @deprecated Prefer startOfZonedDay with explicit timeZone; kept for tests. */
export function startOfLocalDay(d: Date, timeZone = 'UTC'): Date {
  return startOfZonedDay(d, timeZone);
}

/** @deprecated Prefer startOfZonedWeekMonday with explicit timeZone; kept for tests. */
export function startOfWeekMonday(d: Date, timeZone = 'UTC'): Date {
  return startOfZonedWeekMonday(d, timeZone);
}

/** @deprecated Prefer startOfZonedMonth with explicit timeZone; kept for tests. */
export function startOfLocalMonth(d: Date, timeZone = 'UTC'): Date {
  return startOfZonedMonth(d, timeZone);
}

/** @deprecated Prefer subtractMonthsPreserveClockZoned with explicit timeZone; kept for tests. */
export function subtractMonthsPreserveClock(date: Date, months: number, timeZone = 'UTC'): Date {
  return subtractMonthsPreserveClockZoned(date, months, timeZone);
}

/** Parse auth / Hub `created_at` strings; some runtimes are picky about non-ISO shapes. */
export function parseSignupTimeMs(createdAt: string | null | undefined): number | null {
  if (createdAt == null || createdAt === '') return null;
  const parsed = Date.parse(createdAt);
  if (Number.isFinite(parsed)) return parsed;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) ? t : null;
}

function countMsInRange(timesMs: number[], rangeStart: Date, rangeEnd: Date): number {
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  let n = 0;
  for (const t of timesMs) {
    if (t >= startMs && t <= endMs) n += 1;
  }
  return n;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * @param timesMs - Signup instants (e.g. Hub `created_at` parsed to UTC ms).
 * @param now - Reference instant; inject in tests.
 */
export function computeSignupQuickStatsFromMs(
  timesMs: number[],
  now: Date = new Date(),
  opts?: SignupQuickStatsOptions
): SignupQuickStats {
  const timeZone = defaultTimeZone(opts);
  const todayStart = startOfZonedDay(now, timeZone);
  const wtdStart = startOfZonedWeekMonday(now, timeZone);
  const mtdStart = startOfZonedMonth(now, timeZone);

  const today = countMsInRange(timesMs, todayStart, now);
  const weekToDate = countMsInRange(timesMs, wtdStart, now);
  const monthToDate = countMsInRange(timesMs, mtdStart, now);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const prevWtdStart = new Date(wtdStart.getTime() - msPerWeek);
  const prevWtdEnd = new Date(now.getTime() - msPerWeek);
  const weekToDatePrev = countMsInRange(timesMs, prevWtdStart, prevWtdEnd);

  const prevMtdEnd = subtractMonthsPreserveClockZoned(now, 1, timeZone);
  const prevMtdStart = startOfZonedMonth(prevMtdEnd, timeZone);
  const monthToDatePrev = countMsInRange(timesMs, prevMtdStart, prevMtdEnd);

  return {
    today,
    wtd: { count: weekToDate, pctVsPrev: pctChange(weekToDate, weekToDatePrev) },
    mtd: { count: monthToDate, pctVsPrev: pctChange(monthToDate, monthToDatePrev) },
  };
}

/**
 * @param users - Supabase Auth rows with `createdAt` (ISO strings).
 * @param now - Reference instant; inject in tests.
 */
export function computeSignupQuickStats(
  users: Pick<UserProfile, 'createdAt'>[],
  now: Date = new Date(),
  opts?: SignupQuickStatsOptions
): SignupQuickStats {
  const timesMs: number[] = [];
  for (const u of users) {
    const t = parseSignupTimeMs(u.createdAt);
    if (t !== null) timesMs.push(t);
  }
  return computeSignupQuickStatsFromMs(timesMs, now, opts);
}
