export interface Report {
  id: string
  slug: string
  title: string
  excerpt: string
  date: string
  dateModified?: string
  image?: string
}

export const reports: Report[] = [
  {
    id: '1',
    slug: 'system-vs-randomness',
    title: "Best AI Workout Generator (2026): What Actually Works vs. What's Just Random",
    excerpt:
      'Experience the difference with our interactive analysis. Includes live demo to generate a "System" workout plan instantly using our algorithmic engine.',
    date: '2026-01-10',
    dateModified: '2026-01-10',
    image: '/HIIT_Workout.png',
  },
]
