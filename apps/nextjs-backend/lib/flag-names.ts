/**
 * Flag Name Constants
 *
 * This file contains only the flag name constants, which can be safely
 * imported in both server and client components.
 *
 * For server-side flag evaluation with Statsig, import from './flags.ts'
 */

// Flag name constants (kebab-case)
export const FLAG_NAMES = {
  INTRO_START_BUILDING_CLICKED: 'intro-start-building-clicked',
  INTRO_LEARN_MORE_CLICKED: 'intro-learn-more-clicked',
  USER_LOGGED_IN: 'user-logged-in',
  USER_ACCOUNT_CREATED: 'user-account-created',
} as const

export type FlagName = (typeof FLAG_NAMES)[keyof typeof FLAG_NAMES]
