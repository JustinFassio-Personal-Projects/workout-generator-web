/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single source for admin signup quick stats + Created column calendar (IANA).
 * Override with PUBLIC_ADMIN_STATS_TIMEZONE (e.g. America/Los_Angeles).
 */

function trimEnvTz(): string | undefined {
  if (typeof import.meta === 'undefined' || !import.meta.env?.PUBLIC_ADMIN_STATS_TIMEZONE) {
    return undefined;
  }
  const z = String(import.meta.env.PUBLIC_ADMIN_STATS_TIMEZONE).trim();
  return z || undefined;
}

/** Pacific Time by default so stats match PT business day regardless of browser TZ. */
export const ADMIN_STATS_TIMEZONE = trimEnvTz() ?? 'America/Los_Angeles';
