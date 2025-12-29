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
      from: '#f0dc7a',
      to: '#f4e59c',
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
      from: '#f4e59c',
      to: '#e6d185',
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
      from: '#e6d185',
      to: '#d4c469',
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
      from: '#f0dc7a',
      to: '#d4c469',
    },
  },
  {
    id: '5',
    title: 'Mobile Friendly',
    description:
      'Access your workouts anywhere, anytime with our fully responsive design that works perfectly on all devices.',
    icon: Smartphone,
    gradientColors: {
      from: '#f4e59c',
      to: '#f0dc7a',
    },
  },
  {
    id: '6',
    title: 'Customizable Plans',
    description:
      'Tailor every workout to your preferences, equipment availability, and schedule with our flexible customization options.',
    icon: Sparkles,
    gradientColors: {
      from: '#f0dc7a',
      to: '#f4e59c',
    },
  },
]
