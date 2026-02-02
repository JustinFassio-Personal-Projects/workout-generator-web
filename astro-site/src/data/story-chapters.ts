export interface Chapter {
  slug: string
  title: string
  description: string
  order: number
}

export const chapters: Chapter[] = [
  {
    slug: 'santa-cruz-surfing',
    title: 'Santa Cruz: Surfing and an early relationship with fitness',
    description:
      'Growing up in Santa Cruz, where fitness wasn\'t a "program" — it was surfing, moving, getting outside, and building capability.',
    order: 1,
  },
  {
    slug: 'joining-the-air-force',
    title: 'Joining the Air Force',
    description: 'Motivation, discipline, and the identity shift that comes with military service.',
    order: 2,
  },
  {
    slug: 'tacp',
    title: 'TACP: Where fitness becomes readiness',
    description:
      "Mental toughness and performance requirements where fitness isn't vibes — it's preparedness.",
    order: 3,
  },
  {
    slug: 'mft-ufpm-3rd-asog',
    title: 'Fort Hood: MFT/UFPM for 3rd ASOG (11th ASOS)',
    description:
      'Leadership, systems, and safety — running unit fitness programming and reducing injuries across different fitness levels.',
    order: 4,
  },
  {
    slug: 'ucsc-literature-critical-theory',
    title: 'UCSC: Literature, Critical Theory, Semiotics',
    description:
      'How studying systems, meaning, and human behavior shaped a philosophy that the best plan is the one people actually follow.',
    order: 5,
  },
  {
    slug: 'san-diego-core-fitness',
    title: 'San Diego Core Fitness: Building a real training business',
    description:
      "Proof of coaching real humans — programs that don't work in real life don't work.",
    order: 6,
  },
  {
    slug: 'gymgo',
    title: 'GymGo: Designing fitness tech before it was trendy',
    description:
      'Tech credibility and design leadership — fitness products live or die on usability.',
    order: 7,
  },
  {
    slug: 'fitnimbus',
    title: 'FitNimbus: Infrastructure for coaches',
    description:
      'Systems thinking and scaling coaching operations — automation should remove friction, not quality.',
    order: 8,
  },
  {
    slug: 'why-ai-workout-generator',
    title: 'Why AIWorkoutGenerator exists',
    description:
      'The thesis: safe AI, progression logic, anti-randomness stance. Direct conversion disguised as story.',
    order: 9,
  },
]

export const getChaptersByOrder = (): Chapter[] => {
  return [...chapters].sort((a, b) => a.order - b.order)
}
