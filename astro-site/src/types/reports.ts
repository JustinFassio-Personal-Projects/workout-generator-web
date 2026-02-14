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
    image: '/san-diego-core-fitness-hero-1920x1200.webp',
  },
  {
    id: '2',
    slug: 'random-workouts-kill-progress',
    title: "Why 'Random' Workouts Kill Progress (and How to Fix It)",
    excerpt:
      "Stop 'confusing' your muscles and start growing them. Learn why the SAID principle trumps random workouts and how to use progressive overload for real results.",
    date: '2026-01-14',
    dateModified: '2026-01-14',
    image: '/female-situp.jpg',
  },
  {
    id: '3',
    slug: 'ai-hallucinations-health-data',
    title: 'The Problem with AI Hallucinations in Fitness Data',
    excerpt:
      "Generic AI chatbots often invent dangerous exercises. Learn why 'hallucinations' happen in fitness data and how our trainer-verified engine prevents injuries.",
    date: '2026-01-22',
    dateModified: '2026-01-22',
    image: '/Girl Post Training.jpg',
  },
]
