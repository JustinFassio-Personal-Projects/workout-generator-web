/**
 * Feature Flags Configuration
 * Defines flag names and utilities for Vercel feature flags
 */

// Flag name constants (kebab-case as per Vercel convention)
export const FLAG_NAMES = {
  INTRO_START_BUILDING_CLICKED: 'intro-start-building-clicked',
  INTRO_LEARN_MORE_CLICKED: 'intro-learn-more-clicked',
  USER_LOGGED_IN: 'user-logged-in',
  USER_ACCOUNT_CREATED: 'user-account-created',
} as const

export type FlagName = (typeof FLAG_NAMES)[keyof typeof FLAG_NAMES]

/**
 * Server-side flag reporting utility
 * Use this in API routes or server components
 */
export { reportValue } from 'flags'
