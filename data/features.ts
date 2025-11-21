import { LucideIcon } from 'lucide-react'
import { Zap, Target, Users, BarChart3, Smartphone, Sparkles } from 'lucide-react'

export interface Feature {
  id: string
  title: string
  description: string
  icon: LucideIcon
  comingSoon?: boolean
  gradientColors: {
    from: string
    to: string
  }
}

export const features: Feature[] = [
  {
    id: '1',
    title: 'AI-Powered Generation',
    description:
      'Create personalized workouts instantly with our advanced AI algorithm that adapts to your fitness level and goals.',
    icon: Zap,
    gradientColors: {
      from: '#84cc16',
      to: '#22c55e',
    },
  },
  {
    id: '2',
    title: 'Goal Tracking',
    description:
      'Set and track your fitness goals with detailed analytics and progress reports to keep you motivated.',
    icon: Target,
    comingSoon: true,
    gradientColors: {
      from: '#22c55e',
      to: '#16a34a',
    },
  },
  {
    id: '3',
    title: 'Community Support',
    description:
      'Join a thriving community of fitness enthusiasts sharing workouts, tips, and celebrating achievements together.',
    icon: Users,
    comingSoon: true,
    gradientColors: {
      from: '#16a34a',
      to: '#15803d',
    },
  },
  {
    id: '4',
    title: 'Progress Analytics',
    description:
      'Visualize your fitness journey with comprehensive charts and insights that show your improvement over time.',
    icon: BarChart3,
    comingSoon: true,
    gradientColors: {
      from: '#84cc16',
      to: '#65a30d',
    },
  },
  {
    id: '5',
    title: 'Mobile Friendly',
    description:
      'Access your workouts anywhere, anytime with our fully responsive design that works perfectly on all devices.',
    icon: Smartphone,
    gradientColors: {
      from: '#a3e635',
      to: '#84cc16',
    },
  },
  {
    id: '6',
    title: 'Customizable Plans',
    description:
      'Tailor every workout to your preferences, equipment availability, and schedule with our flexible customization options.',
    icon: Sparkles,
    gradientColors: {
      from: '#4ade80',
      to: '#22c55e',
    },
  },
]
