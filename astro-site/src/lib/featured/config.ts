/**
 * Shared config for featured content (hub page and optionally homepage).
 * Limits apply to the Explore hub; homepage typically uses smaller limits (e.g. 3).
 */
export const featuredContentConfig = {
  limits: {
    programs: 6,
    challenges: 6,
    workouts: 6,
  },
  /** Section order for hub page and optionally homepage. */
  sectionOrder: ['programs', 'challenges', 'workouts', 'exercisesLearn'] as const,
}

export type FeaturedSectionKey = (typeof featuredContentConfig.sectionOrder)[number]
