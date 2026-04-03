/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pacific calendar-day lower bound for admin “Live” activity (America/Los_Angeles, DST-aware).
 */

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** IANA zone for “today” (PST/PDT). */
export const LIVE_HUB_ACTIVITY_TIMEZONE = 'America/Los_Angeles';

/**
 * UTC instant for 00:00:00 on the same calendar date as `now` in {@link LIVE_HUB_ACTIVITY_TIMEZONE}.
 */
export function getStartOfPacificCalendarDayUtc(now: Date = new Date()): Date {
  const tz = LIVE_HUB_ACTIVITY_TIMEZONE;
  const ymd = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  return fromZonedTime(`${ymd}T00:00:00`, tz);
}
