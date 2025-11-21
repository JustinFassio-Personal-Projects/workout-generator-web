import { LucideIcon } from 'lucide-react'
import { UserPlus, Target, Dumbbell, Trophy, TrendingUp } from 'lucide-react'

export interface JourneyStep {
  id: string
  number: number
  title: string
  description: string
  icon: LucideIcon
  features: string[]
  comingSoonFeatures?: string[] // Features that should show "(Coming Soon)"
  accentColor: string
}

export const journeySteps: JourneyStep[] = [
  {
    id: '1',
    number: 1,
    title: 'Sign Up & Set Goals',
    description:
      'Create your account and tell us about your fitness goals, experience level, and preferences.',
    icon: UserPlus,
    features: [
      'Quick 2-minute setup',
      'Goal customization',
      'Fitness level assessment',
      'Equipment preferences',
    ],
    accentColor: '#84cc16',
  },
  {
    id: '2',
    number: 2,
    title: 'Get Your Plan',
    description:
      'Our AI generates a personalized workout plan tailored specifically to your goals and capabilities.',
    icon: Target,
    features: [
      'AI-powered generation',
      'Personalized routines',
      'Adaptive difficulty',
      'Equipment-based options',
    ],
    accentColor: '#22c55e',
  },
  {
    id: '3',
    number: 3,
    title: 'Start Training',
    description:
      'Begin your fitness journey with guided workouts, exercise demonstrations, and real-time form tips.',
    icon: Dumbbell,
    features: [
      'Step-by-step guidance',
      'Video demonstrations',
      'Form corrections',
      'Rest timer included',
    ],
    comingSoonFeatures: ['Video demonstrations', 'Rest timer included'],
    accentColor: '#16a34a',
  },
  {
    id: '4',
    number: 4,
    title: 'Track Progress',
    description:
      'Monitor your improvements with detailed analytics, workout history, and achievement milestones.',
    icon: TrendingUp,
    features: ['Progress charts', 'Workout history', 'Achievement badges', 'Performance insights'],
    comingSoonFeatures: ['Progress charts', 'Achievement badges', 'Performance insights'],
    accentColor: '#15803d',
  },
  {
    id: '5',
    number: 5,
    title: 'Achieve Results',
    description:
      'Reach your fitness goals and celebrate your success with our community of motivated individuals.',
    icon: Trophy,
    features: [
      'Goal completion',
      'Community recognition',
      'New challenges',
      'Continuous improvement',
    ],
    comingSoonFeatures: ['Goal completion', 'Community recognition'],
    accentColor: '#84cc16',
  },
]
