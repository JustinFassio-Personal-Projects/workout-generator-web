import type { TransformedPost } from '@/types/blog'

/**
 * Fallback blog posts when Supabase is unavailable or returns no results.
 * Used by lib/blog/queries and feed.xml.
 */
export const fallbackPosts: TransformedPost[] = [
  {
    id: '1',
    slug: 'getting-started-with-ai-workouts',
    title: 'Getting Started with AI-Powered Workouts',
    excerpt:
      'Learn how to create your first AI-generated workout plan using an approach built on real training principles, not random prompts.',
    content: '',
    date: '2026-01-07',
    dateModified: '2026-01-07',
    author: 'Justin Fassio',
    category: 'Fitness',
    tags: ['AI Workouts', 'Beginner', 'Personalized Training'],
    image: '/ai_workout_generator_hero_1.png',
  },
]
