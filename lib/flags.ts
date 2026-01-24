/**
 * Feature Flags Configuration (Server-Side Only)
 *
 * This file contains Statsig feature flag utilities that use server-side modules.
 * DO NOT import this file in client components - it uses 'flags/next' which
 * requires Node.js-only modules like 'async_hooks'.
 *
 * For flag names that can be used in client components, import from './flag-names.ts'
 */

import { statsigAdapter, type StatsigUser } from '@flags-sdk/statsig'
import { flag, dedupe } from 'flags/next'
import type { Identify } from 'flags'

// Re-export flag names for convenience (but prefer importing from flag-names.ts in client code)
export { FLAG_NAMES, type FlagName } from './flag-names'
import { FLAG_NAMES } from './flag-names'

/**
 * User identification function for Statsig
 * Uses anonymous user identification (no userID) for this site
 * which doesn't have user authentication
 */
export const identify = dedupe((async () => ({
  userID: undefined, // Anonymous users
  customIDs: {}, // Empty custom IDs for anonymous users
})) satisfies Identify<StatsigUser>)

/**
 * Creates a Statsig feature flag getter function
 * @param key - The flag key name
 * @returns A function that returns the flag value (boolean)
 */
export const createFeatureFlag = (key: string) =>
  flag<boolean, StatsigUser>({
    key,
    adapter: statsigAdapter.featureGate(gate => gate.value, { exposureLogging: true }),
    identify,
  })

// Export flag getters for each flag name
export const getIntroStartBuildingClicked = createFeatureFlag(
  FLAG_NAMES.INTRO_START_BUILDING_CLICKED
)
export const getIntroLearnMoreClicked = createFeatureFlag(FLAG_NAMES.INTRO_LEARN_MORE_CLICKED)
export const getUserLoggedIn = createFeatureFlag(FLAG_NAMES.USER_LOGGED_IN)
export const getUserAccountCreated = createFeatureFlag(FLAG_NAMES.USER_ACCOUNT_CREATED)
