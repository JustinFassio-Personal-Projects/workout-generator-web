import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export const metadata: Metadata = {
  title: 'Submit an Exercise - Exercise Challenge',
  description:
    'Use our visual movement lab to refine technique, then contribute an exercise to the library. Get rewarded if we publish it!',
  openGraph: {
    title: 'Submit an Exercise - Exercise Challenge',
    description:
      'Use our visual movement lab to refine technique, then contribute an exercise to the library. Get rewarded if we publish it!',
    url: `${baseUrl}/exercise-challenge`,
  },
}

export default function ExerciseChallengeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
